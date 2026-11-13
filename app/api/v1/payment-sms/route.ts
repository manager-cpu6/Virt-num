import {NextResponse} from "next/server";
import crypto from "crypto";
import {collection,getMongoClient,mongoId} from "@/lib/mongo";
import {notifyUser} from "@/lib/notifications";
export const runtime="nodejs";export const dynamic="force-dynamic";
function digest(s:string){return crypto.createHash("sha256").update(s).digest();}
function same(a:string,b:string){const x=digest(a),y=digest(b);return x.length===y.length&&crypto.timingSafeEqual(x,y);}
function phone(v:string){return v.replace(/[^0-9]/g,"").replace(/^251/,"0");}
function nameKey(v:string){return v.normalize("NFKC").toLocaleLowerCase().replace(/[^\p{L}\p{N}]+/gu," ").trim().split(/\s+/).filter(Boolean).sort().join(" ");}
const providerMethods:Record<string,string[]>={EBIRR:["ebirr","coopay_ebirr"],COOPAY_EBIRR:["coopay_ebirr"],KAAFI:["kaafi_ebirr"],KAAFI_EBIRR:["kaafi_ebirr"],CBE:["cbe_birr","cbe_bank"],CBE_BIRR:["cbe_birr"],CBE_BANK:["cbe_bank"],MPESA:["mpesa"],M_PESA:["mpesa"],TELEBIRR:["telebirr"]};
function parse(body:string){
 const amountPatterns=[
  /(?:amount|received|credited|deposit|paid|transfer(?:red)?)\s*(?:of|is|was|:|=)?\s*(?:ETB|Birr)\s*([\d,]+(?:\.\d{1,2})?)/i,
  /(?:ETB|Birr)\s*([\d,]+(?:\.\d{1,2})?)/i,
  /([\d,]+(?:\.\d{1,2})?)\s*(?:ETB|Birr)\b/i
 ];
 let amount:number|null=null;
 for(const pattern of amountPatterns){const m=body.match(pattern);if(m){const n=Number(m[1].replace(/,/g,""));if(Number.isFinite(n)&&n>0){amount=n;break;}}}
 const ref=body.match(/(?:reference|ref(?:erence)?\s*(?:no|number)?|txn(?:\s*id)?|transaction\s*(?:id|no|number)|trans(?:action)?\s*no)\s*[:#= -]*([A-Z0-9-]{6,})/i)?.[1]||"";
 const phonePattern="(?:\\+?251[\\s-]?[79](?:[\\s-]?\\d){8}|0[79](?:[\\s-]?\\d){8})";
 const payerMatch=body.match(new RegExp("(?:from|sender|payer|customer|debited\\s+from|sent\\s+by|mobile(?:\\s+number)?|phone(?:\\s+number)?|የላኪ|ላኪ)\\D{0,45}("+phonePattern+")","i"));
 const payerPhone=payerMatch?phone(payerMatch[1]):"";
 const nameMatch=body.match(/(?:from|sender|payer|customer(?:\s+name)?|sender\s+name|name|sent\s+by|የላኪ\s*ስም|ላኪ)\s*[:#=-]?\s*([\p{L}][\p{L}.' -]{1,60}?)(?=\s*(?:\+?251|0[79]\d{8}|,|;|\(|\b(?:phone|mobile|account|on|at|ref|txn|amount|ETB|Birr)\b|$))/iu);
 const payerName=nameMatch?.[1]?.trim().replace(/[.,;:-]+$/,"")||"";
 const positive=/(?:received|credited|deposit(?:ed)?|has been received|you have received|ደረሰ|ገቢ ሆኗል)/i.test(body);
 return {amount,reference:ref,payerPhone,payerName,positive};
}
export async function POST(req:Request){
 try{
  const body:any=await req.json(),token=String(req.headers.get("x-numelixa-device-token")||"");
  const settings=await (await collection<any>("settings")).findOne({_id:"payments"});
  const expected=String(settings?.ebirrDeviceTokenHash||"");
  if(!token||!expected||!same(crypto.createHash("sha256").update(token).digest("hex"),expected))return NextResponse.json({ok:false,error:"Device is not paired."},{status:401});
  if(body.type==="webhook_test")return NextResponse.json({ok:true});
  const raw=String(body.rawBody||"").trim(),parsed=parse(raw),provider=String(body.provider||"").toUpperCase().replace(/[^A-Z_]/g,""),allowed=providerMethods[provider];
  if(!raw||!allowed)return NextResponse.json({ok:true,matched:false,reason:"not_supported_wallet_sms"});
  const payments=await collection<any>("payments");
  let matched=false,reason="sms_missing_amount_name_or_sender_number",creditedOrderId="";
  const safeReference=parsed.reference||("SMS-"+crypto.createHash("sha256").update(provider+"|"+raw).digest("hex"));
  if(parsed.positive&&parsed.amount&&parsed.payerPhone&&parsed.payerName){
   const cutoff=new Date(Date.now()-30*60*1000);
   const candidates=await payments.find({provider:"ebirr_manual",method:{$in:allowed},payerPhone:parsed.payerPhone,amountEtb:parsed.amount,status:{$in:["awaiting_proof","pending_review"]},credited:{$ne:true},createdAt:{$gte:cutoff}}).limit(3).toArray();
   reason=candidates.length===0?"no_matching_recent_order":candidates.length>1?"multiple_matching_orders":"payer_name_mismatch";
   if(candidates.length===1){
    const order=candidates[0],receiverMatches=!!body.receivingSimPhone&&phone(String(body.receivingSimPhone))===phone(String(order.receiverPhone||""));
    const namesMatch=!!order.payerName&&nameKey(parsed.payerName)===nameKey(String(order.payerName));
    if(!namesMatch)reason="payer_name_mismatch";
    else if(!receiverMatches)reason="receiving_sim_mismatch";
    else{
     const session=getMongoClient().startSession();let credited=false;
     try{await session.withTransaction(async()=>{
      const claims=await collection<any>("paymentSmsClaims");
      await claims.insertOne({_id:crypto.createHash("sha256").update(String(order.method)+"|"+safeReference).digest("hex"),provider,method:String(order.method),transactionReference:safeReference,orderId:String(order.orderId),createdAt:new Date()},{session});
      const claimed=await payments.findOneAndUpdate({_id:order._id,credited:{$ne:true},status:{$in:["awaiting_proof","pending_review"]}},{$set:{status:"paid",credited:true,smsMatched:true,smsMatchedAt:new Date(),smsAmount:parsed.amount,smsPayerPhone:parsed.payerPhone,smsPayerName:parsed.payerName,transactionReference:safeReference,bankTransactionReference:parsed.reference||null,smsOrigin:String(body.senderPhone||""),smsRaw:raw,paidAt:new Date(),updatedAt:new Date(),verificationMethod:"incoming_sms_exact_payer_name_phone_amount_receiver_and_unique_reference"}},{session,returnDocument:"before"});
      if(!claimed)throw new Error("PAYMENT_ORDER_ALREADY_CLAIMED");
      const users=await collection<any>("users"),user=await users.findOneAndUpdate({_id:String(order.userId)},{$inc:{coins:Number(order.coins)}},{session,returnDocument:"after"});
      if(!user)throw new Error("Payment user not found");
      await (await collection<any>("coinTransactions")).insertOne({_id:mongoId(),userId:String(order.userId),type:"credit",amount:Number(order.coins),balanceAfter:Number(user.coins),reference:order.orderId,description:"Ethiopia wallet payment auto-verified by incoming SMS",createdAt:new Date()},{session});
      credited=true;
     });}catch(e:any){if(e?.code===11000)reason="duplicate_transaction_reference";else if(e instanceof Error&&e.message==="PAYMENT_ORDER_ALREADY_CLAIMED")reason="order_already_processed";else throw e;}finally{await session.endSession();}
     matched=credited;creditedOrderId=credited?String(order.orderId):"";
     if(credited){reason="payer_name_phone_amount_receiver_and_sms_verified";try{await notifyUser(String(order.userId),"Payment confirmed","Your Ethiopia payment was verified and your Numelixa wallet has been credited.",{type:"payment",orderId:String(order.orderId)});}catch{}}
    }
   }
  }
  await (await collection<any>("ebirrSmsEvents")).insertOne({provider,amount:parsed.amount,transactionReference:safeReference,payerName:parsed.payerName||null,payerPhone:parsed.payerPhone||null,simPhone:String(body.receivingSimPhone||""),simOperator:String(body.simOperator||""),smsOrigin:String(body.senderPhone||""),rawBody:raw,matched,reason,creditedOrderId:creditedOrderId||null,receivedAt:new Date(),deviceId:String(body.deviceId||"")});
  return NextResponse.json({ok:true,matched,reason});
 }catch(e){console.error("[EBIRR SMS INGEST]",e);return NextResponse.json({ok:false,error:"Unable to process incoming payment SMS."},{status:500});}
}
