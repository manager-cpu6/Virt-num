import {NextResponse} from "next/server";
import crypto from "crypto";
import {collection,getMongoClient,mongoId} from "@/lib/mongo";
import {notifyUser} from "@/lib/notifications";
import {sendEmailFrom,ethiopiaPaymentReceiptEmail} from "@/lib/mailer";
import {applyReferralReward} from "@/lib/referrals";
export const runtime="nodejs";export const dynamic="force-dynamic";
function digest(s:string){return crypto.createHash("sha256").update(s).digest();}
function same(a:string,b:string){const x=digest(a),y=digest(b);return x.length===y.length&&crypto.timingSafeEqual(x,y);}
function phone(v:string){return v.replace(/[^0-9]/g,"").replace(/^251/,"0");}
function extractPayerPhone(body:string){
 const pattern=/(?<![0-9])(?:\+251|251|0)[79](?:[\s-]?\d){8}(?![0-9])/g;
 const reference=/(?:transfer\s*id|reference|\bref\b|transaction\s*(?:id|no|number|ref)|txn\s*(?:id|no|ref)|trace\s*(?:id|no)|receipt\s*(?:id|no)|order\s*(?:id|no))\s*[:#=-]?\s*$/i;
 const matches=[...body.matchAll(pattern)].filter(m=>!reference.test(body.slice(Math.max(0,(m.index||0)-45),m.index||0)));
 const selected=matches.sort((a,b)=>{
  const score=(m:RegExpExecArray)=>{const before=body.slice(Math.max(0,(m.index||0)-55),m.index||0).toLowerCase();return /(?:from|sender|payer|customer|sent by)\D{0,45}$/.test(before)?3:before.includes("(")?2:1;};
  return score(b)-score(a);
 })[0]?.[0];
 if(!selected)return "";
 const digits=selected.replace(/[^0-9]/g,"");
 const local=digits.startsWith("251")?"0"+digits.slice(3):digits;
 return /^0[79]\d{8}$/.test(local)?local:"";
}
function nameKey(v:string){return v.normalize("NFKC").toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu," ").trim().split(/\s+/).filter(Boolean).sort().join(" ");}
function editSimilarity(a:string,b:string){const x=Array.from(a),y=Array.from(b);if(x.join("")===y.join(""))return 1;if(!x.length||!y.length)return 0;const d=Array.from({length:x.length+1},()=>new Array(y.length+1).fill(0));for(let i=0;i<=x.length;i++)d[i][0]=i;for(let j=0;j<=y.length;j++)d[0][j]=j;for(let i=1;i<=x.length;i++)for(let j=1;j<=y.length;j++){const cost=x[i-1]===y[j-1]?0:1;d[i][j]=Math.min(d[i-1][j]+1,d[i][j-1]+1,d[i-1][j-1]+cost);if(i>1&&j>1&&x[i-1]===y[j-2]&&x[i-2]===y[j-1])d[i][j]=Math.min(d[i][j],d[i-2][j-2]+cost);}return 1-d[x.length][y.length]/Math.max(x.length,y.length);}
function nameSimilarity(a:string,b:string){const x=nameKey(a),y=nameKey(b);if(!x||!y)return 0;const character=editSimilarity(x,y),left=x.split(" "),right=y.split(" ");const score=(from:string[],to:string[])=>from.reduce((sum,word)=>sum+Math.max(...to.map(other=>editSimilarity(word,other))),0)/from.length;const token=(score(left,right)+score(right,left))/2;return Math.max(character,token);}
const providerMethods:Record<string,string[]>={EBIRR:["ebirr","coopay_ebirr"],COOPAY_EBIRR:["coopay_ebirr"],KAAFI:["kaafi_ebirr"],KAAFI_EBIRR:["kaafi_ebirr"],CBE:["cbe_birr","cbe_bank"],CBE_BIRR:["cbe_birr"],CBE_BANK:["cbe_bank"],MPESA:["mpesa"],M_PESA:["mpesa"],TELEBIRR:["telebirr"]};
function parse(body:string){
 // Parse only currency-labelled amounts (ETB/Birr). Never interpret Transfer ID or other numeric IDs as money.
 const amountPatterns=[
  /\b(?:ETB|Birr)\s*([\d,]+(?:\.\d{1,2})?)\b/i,
  /\b([\d,]+(?:\.\d{1,2})?)\s*(?:ETB|Birr)\b/i,
  /\b(?:amount|credited|deposit(?:ed)?|paid)\s*(?:of|is|was|:|=)?\s*(?:ETB|Birr)\s*([\d,]+(?:\.\d{1,2})?)\b/i
 ];
 let amount:number|null=null;
 for(const pattern of amountPatterns){const m=body.match(pattern);if(m){const n=Number(m[1].replace(/,/g,""));if(Number.isFinite(n)&&n>0){amount=n;break;}}}

 const payerPhone=extractPayerPhone(body);
 const namePattern=/(?:from|sender|payer|customer(?:\s+name)?|sender\s+name|name|sent\s+by|የላኪ\s*ስም|ላኪ)\s*[:#=-]?\s*([\p{L}][\p{L}.' -]{1,60}?)(?=\s*(?:\+?251|0[79]\d{8}|,|;|\(|\b(?:phone|mobile|account|sent|received|paid|credited|transferred|on|at|ref|txn|amount|ETB|Birr)\b|$))/giu;
 const nameCandidates=[...body.matchAll(namePattern)].map(m=>m[1].trim().replace(/[.,;:-]+$/,"")).filter(n=>!["sender","payer","customer","account","bank"].includes(n.toLowerCase()));
 const payerName=nameCandidates[nameCandidates.length-1]||"";
 const negative=/(?:failed|unsuccessful|declined|reversed|cancelled|canceled|rejected|not successful|አልተሳካም|ውድቅ)/i.test(body);
 const positive=!negative&&/(?:received|credited|deposit(?:ed)?|has been received|you have received|payment successful|payment completed|transaction successful|transaction completed|transfer successful|transfer completed|successfully transferred|successfully sent|sent successfully|debited successfully|money received|has been deposited|ደረሰ|ገቢ ሆኗል|ተቀብለዋል)/i.test(body);
 return {amount,payerPhone,payerName,positive};
}
export async function POST(req:Request){
 try{
  const body:any=await req.json(),token=String(req.headers.get("x-numelixa-device-token")||"");
  const settings=await (await collection<any>("settings")).findOne({_id:"payments"});
  const expected=String(settings?.ebirrDeviceTokenHash||""),expectedSimPhone=phone(String(settings?.ebirrSmsReceivingPhone||""));
  if(!token||!expected||!same(crypto.createHash("sha256").update(token).digest("hex"),expected))return NextResponse.json({ok:false,error:"Device is not paired."},{status:401});
  if(body.type==="webhook_test")return NextResponse.json({ok:true});
  const raw=String(body.rawBody||"").trim(),parsed=parse(raw),payerName=parsed.payerName||String(body.senderName||"").trim(),provider=String(body.provider||"").toUpperCase().replace(/[^A-Z_]/g,""),allowed=providerMethods[provider];
  if(!raw||!allowed)return NextResponse.json({ok:true,matched:false,reason:"not_supported_wallet_sms"});
  const payments=await collection<any>("payments");
  let matched=false,reason="sms_missing_amount_or_sender_number",creditedOrderId="",checkedOrderIds:any[]=[];
  const safeReference="SMS-"+crypto.createHash("sha256").update(provider+"|"+parsed.payerPhone+"|"+String(parsed.amount)+"|"+raw).digest("hex");
  if(parsed.positive&&parsed.amount&&parsed.payerPhone){
   const cutoff=new Date(Date.now()-24*60*60*1000);
   const recentByPhone=await payments.find({provider:"ebirr_manual",method:{$in:allowed},payerPhone:parsed.payerPhone,status:{$in:["awaiting_proof","pending_review"]},credited:{$ne:true},createdAt:{$gte:cutoff}}).limit(50).toArray();
   checkedOrderIds=recentByPhone.map((o:any)=>o._id);
   const possible=recentByPhone.filter((o:any)=>Number(o.amountEtb)===parsed.amount);
   const candidates=possible.filter((o:any)=>{const saved=String(o.payerName||"").trim();return !saved||!payerName||nameSimilarity(saved,payerName)>=0.8;});
   reason=recentByPhone.length===0?"no_matching_recent_order":possible.length===0?"amount_mismatch":candidates.length===0?"payer_name_mismatch":candidates.length>1?"multiple_matching_orders":"receiving_sim_mismatch";
   if(candidates.length===1){
    const order=candidates[0],receiverMatches=!!expectedSimPhone&&!!body.receivingSimPhone&&phone(String(body.receivingSimPhone))===expectedSimPhone;
    const namesMatch=!order.payerName||!payerName||nameSimilarity(String(order.payerName),payerName)>=0.8;
    if(!namesMatch)reason="payer_name_mismatch";
    else if(!expectedSimPhone)reason="sms_receiving_sim_not_configured";
    else if(!receiverMatches)reason="receiving_sim_mismatch";
    else{
     const session=getMongoClient().startSession();let credited=false;
     try{await session.withTransaction(async()=>{
      const claims=await collection<any>("paymentSmsClaims");
      await claims.insertOne({_id:crypto.createHash("sha256").update(String(order.method)+"|"+safeReference).digest("hex"),provider,method:String(order.method),transactionReference:safeReference,orderId:String(order.orderId),createdAt:new Date()},{session});
      const claimed=await payments.findOneAndUpdate({_id:order._id,credited:{$ne:true},status:{$in:["awaiting_proof","pending_review"]}},{$set:{status:"paid",credited:true,smsMatched:true,smsMatchedAt:new Date(),smsAmount:parsed.amount,smsPayerPhone:parsed.payerPhone,smsPayerName:payerName,transactionReference:safeReference,bankTransactionReference:null,smsOrigin:String(body.senderPhone||""),smsRaw:raw,paidAt:new Date(),updatedAt:new Date(),verificationMethod:"incoming_sms_payer_phone_exact_amount_optional_name_similarity_80_receiver_and_sms_fingerprint"}},{session,returnDocument:"before"});
      if(!claimed)throw new Error("PAYMENT_ORDER_ALREADY_CLAIMED");
      const users=await collection<any>("users"),user=await users.findOneAndUpdate({_id:String(order.userId)},{$inc:{coins:Number(order.coins)}},{session,returnDocument:"after"});
      if(!user)throw new Error("Payment user not found");
      await (await collection<any>("coinTransactions")).insertOne({_id:mongoId(),userId:String(order.userId),type:"credit",amount:Number(order.coins),balanceAfter:Number(user.coins),reference:order.orderId,description:"Ethiopia wallet payment auto-verified by incoming SMS",createdAt:new Date()},{session});
      credited=true;
     });}catch(e:any){if(e?.code===11000)reason="duplicate_transaction_reference";else if(e instanceof Error&&e.message==="PAYMENT_ORDER_ALREADY_CLAIMED")reason="order_already_processed";else throw e;}finally{await session.endSession();}
     matched=credited;creditedOrderId=credited?String(order.orderId):"";
     if(credited){reason="payer_phone_amount_receiver_and_sms_verified";try{await applyReferralReward({userId:String(order.userId),paymentReference:String(order.orderId),amountUsd:Number(order.amountUsd||0),description:"Ethiopia payment verified by incoming SMS"});}catch(error){console.error("[REFERRAL REWARD]",error)}try{await notifyUser(String(order.userId),"Payment confirmed","Your Ethiopia payment was verified and your Numelixa wallet has been credited.",{type:"payment",orderId:String(order.orderId)});}catch{}try{const paidUser=await (await collection<any>("users")).findOne({_id:String(order.userId)},{projection:{email:1,name:1}});if(paidUser?.email){const receiptId=String(order.receiptId||order.orderId),paidAt=new Date().toLocaleString("en-ET",{timeZone:"Africa/Addis_Ababa"});await sendEmailFrom("payment",String(paidUser.email),"Payment verified — Numelixa receipt "+receiptId,ethiopiaPaymentReceiptEmail(String(paidUser.name||""),receiptId,String(order.methodName||order.method||"Ethiopia Payment"),String(parsed.payerPhone||order.payerPhone||""),String(order.receiverPhone||""),Number(order.amountUsd||0),Number(order.amountEtb||0),safeReference,paidAt));}}catch(error){console.error("[ETHIOPIA PAYMENT RECEIPT EMAIL]",error instanceof Error?error.message:"send failed")}}
    }
   }
  }
  if(!matched&&checkedOrderIds.length)await payments.updateMany({_id:{$in:checkedOrderIds},credited:{$ne:true}},{$set:{smsLastCheck:{reason,payerName,payerPhone:parsed.payerPhone,amount:parsed.amount,checkedAt:new Date()}}});
  await (await collection<any>("ebirrSmsEvents")).insertOne({provider,amount:parsed.amount,transactionReference:safeReference,payerName:payerName||null,payerPhone:parsed.payerPhone||null,simPhone:String(body.receivingSimPhone||""),simOperator:String(body.simOperator||""),smsOrigin:String(body.senderPhone||""),rawBody:raw,matched,reason,creditedOrderId:creditedOrderId||null,receivedAt:new Date(),deviceId:String(body.deviceId||"")});
  return NextResponse.json({ok:true,matched,reason});
 }catch(e){console.error("[EBIRR SMS INGEST]",e);return NextResponse.json({ok:false,error:"Unable to process incoming payment SMS."},{status:500});}
}
