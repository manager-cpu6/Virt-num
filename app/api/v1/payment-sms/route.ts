import {NextResponse} from "next/server";
import crypto from "crypto";
import {collection,getMongoClient,mongoId} from "@/lib/mongo";
import {notifyUser} from "@/lib/notifications";
export const runtime="nodejs";export const dynamic="force-dynamic";
function digest(s:string){return crypto.createHash("sha256").update(s).digest();}
function same(a:string,b:string){const x=digest(a),y=digest(b);return x.length===y.length&&crypto.timingSafeEqual(x,y);}
function phone(v:string){return v.replace(/[^0-9]/g,"").replace(/^251/,"0");}
function parse(body:string){
 const amountMatch=body.match(/(?:ETB|Birr|Amount|paid|received|credited)\s*[:=]?\s*([\d,]+(?:\.\d{1,2})?)|([\d,]+(?:\.\d{1,2})?)\s*(?:ETB|Birr)/i);
 const amount=Number((amountMatch?.[1]||amountMatch?.[2]||"").replace(/,/g,""));
 const reference=body.match(/(?:reference|ref|txn(?:\s*id)?|transaction\s*id|trans(?:action)?\s*no)\s*[:#= -]*([A-Z0-9-]{6,})/i)?.[1]||"";
 const payer=body.match(/(?:from|sender|payer|customer)\D{0,16}(\+?251[79]\d{8}|0[79]\d{8})/i)?.[1]||"";
 const positive=/(received|credited|deposit|transfer successful|payment successful|you have received)/i.test(body);
 return {amount:Number.isFinite(amount)&&amount>0?amount:null,reference,payerPhone:payer?phone(payer):"",positive};
}
export async function POST(req:Request){
 try{
  const body:any=await req.json(),token=String(req.headers.get("x-numelixa-device-token")||"");
  const settings=await (await collection<any>("settings")).findOne({_id:"payments"});
  const expected=String(settings?.ebirrDeviceTokenHash||"");
  if(!token||!expected||!same(crypto.createHash("sha256").update(token).digest("hex"),expected))return NextResponse.json({ok:false,error:"Device is not paired."},{status:401});
  if(body.type==="webhook_test")return NextResponse.json({ok:true});
  const raw=String(body.rawBody||"").trim(),parsed=parse(raw),provider=String(body.provider||"").toUpperCase();
  if(!raw||!/(EBIRR|KAAFI|CBE\\s*-?BIRR)/i.test(provider))return NextResponse.json({ok:true,matched:false,reason:"not_supported_wallet_sms"});
  const payments=await collection<any>("payments");
  let matched=false,reason="sms_missing_completed_amount_or_sender_phone",creditedOrderId="";
  if(parsed.positive&&parsed.amount&&parsed.payerPhone){
   const cutoff=new Date(Date.now()-30*60*1000);
   const candidates=await payments.find({provider:"ebirr_manual",method:{$in:["coopay_ebirr","kaafi_ebirr","cbe_birr"]},payerPhone:parsed.payerPhone,amountEtb:parsed.amount,status:{$in:["awaiting_proof","pending_review"]},credited:{$ne:true},createdAt:{$gte:cutoff}}).limit(2).toArray();
   reason=candidates.length===0?"no_unique_recent_order_match":candidates.length>1?"multiple_matching_orders":"receiver_sim_check_failed";
   const receiverMatches=!!body.receivingSimPhone&&phone(String(body.receivingSimPhone))===phone(String(settings?.ebirrReceiver||""));
   if(candidates.length===1&&receiverMatches){
    const order=candidates[0],session=getMongoClient().startSession();let credited=false;
    try{await session.withTransaction(async()=>{
     const claimed=await payments.findOneAndUpdate({_id:order._id,credited:{$ne:true},status:{$in:["awaiting_proof","pending_review"]}},{$set:{status:"paid",credited:true,smsMatched:true,smsMatchedAt:new Date(),smsAmount:parsed.amount,smsPayerPhone:parsed.payerPhone,smsOrigin:String(body.senderPhone||""),smsRaw:raw,paidAt:new Date(),updatedAt:new Date(),verificationMethod:"payer_phone_amount_and_incoming_sms"}},{session,returnDocument:"before"});
     if(!claimed)return;
     const users=await collection<any>("users"),user=await users.findOneAndUpdate({_id:String(order.userId)},{$inc:{coins:Number(order.coins)}},{session,returnDocument:"after"});
     if(!user)throw new Error("Payment user not found");
     await (await collection<any>("coinTransactions")).insertOne({_id:mongoId(),userId:String(order.userId),type:"credit",amount:Number(order.coins),balanceAfter:Number(user.coins),reference:order.orderId,description:"Ethiopia wallet payment auto-verified by incoming SMS",createdAt:new Date()},{session});
     credited=true;
    });}finally{await session.endSession();}
    matched=credited;creditedOrderId=credited?String(order.orderId):"";
    reason=credited?"payer_phone_amount_receiver_and_sms_verified":"order_already_processed";
    if(credited){try{await notifyUser(String(order.userId),"Payment confirmed","Your Ethiopia payment was verified and your Numelixa wallet has been credited.",{type:"payment",orderId:String(order.orderId)});}catch{}}
   }else if(candidates.length===1&&!receiverMatches)reason="receiving_sim_mismatch";
  }
  await (await collection<any>("ebirrSmsEvents")).insertOne({provider,amount:parsed.amount,transactionReference:parsed.reference||null,payerPhone:parsed.payerPhone||null,simPhone:String(body.receivingSimPhone||""),simOperator:String(body.simOperator||""),smsOrigin:String(body.senderPhone||""),rawBody:raw,matched,reason,creditedOrderId:creditedOrderId||null,receivedAt:new Date(),deviceId:String(body.deviceId||"")});
  return NextResponse.json({ok:true,matched,reason});
 }catch(e){console.error("[EBIRR SMS INGEST]",e);return NextResponse.json({ok:false,error:"Unable to process incoming payment SMS."},{status:500});}
}
