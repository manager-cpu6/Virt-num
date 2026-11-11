import {NextResponse} from "next/server";
import crypto from "crypto";
import {collection} from "@/lib/mongo";
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
  if(!raw||!provider.includes("EBIRR"))return NextResponse.json({ok:true,matched:false,reason:"not_ebirr_sms"});
  const payments=await collection<any>("payments");
  let matched=false,reason="sms_does_not_contain_completed_payment_details";
  if(parsed.positive&&parsed.amount&&parsed.reference){
   const order=await payments.findOne({provider:"ebirr_manual",transactionReference:parsed.reference,status:"pending_review",credited:{$ne:true}});
   reason="no_order_reference_match";
   if(order){
    const amountMatches=Math.abs(Number(order.amountEtb)-parsed.amount)<0.01;
    const payerMatches=!!parsed.payerPhone&&phone(String(order.payerPhone||""))===parsed.payerPhone;
    const receiverMatches=!!body.receivingSimPhone&&phone(String(body.receivingSimPhone))===phone(String(settings?.ebirrReceiver||""));
    if(amountMatches&&payerMatches&&receiverMatches){
     await payments.updateOne({_id:order._id,status:"pending_review",credited:{$ne:true}},{$set:{smsMatched:true,smsMatchedAt:new Date(),smsAmount:parsed.amount,smsPayerPhone:parsed.payerPhone,smsOrigin:String(body.senderPhone||""),smsRaw:raw,updatedAt:new Date()}});
     matched=true;reason="reference_amount_payer_and_receiving_sim_match";
    }else reason=!amountMatches?"amount_mismatch":!payerMatches?"payer_phone_mismatch":"receiving_sim_mismatch";
   }
  }
  await (await collection<any>("ebirrSmsEvents")).insertOne({provider,amount:parsed.amount,transactionReference:parsed.reference||null,payerPhone:parsed.payerPhone||null,simPhone:String(body.receivingSimPhone||""),simOperator:String(body.simOperator||""),smsOrigin:String(body.senderPhone||""),rawBody:raw,matched,reason,receivedAt:new Date(),deviceId:String(body.deviceId||"")});
  return NextResponse.json({ok:true,matched,reason});
 }catch(e){console.error("[EBIRR SMS INGEST]",e);return NextResponse.json({ok:false,error:"Unable to process incoming payment SMS."},{status:500});}
}
