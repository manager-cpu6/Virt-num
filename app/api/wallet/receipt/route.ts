import {NextResponse} from "next/server";
import crypto from "crypto";
import {requireUser} from "@/lib/auth";
import {collection} from "@/lib/mongo";
import {getSettings} from "@/lib/settings";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function GET(req:Request){
 try{
  const user=await requireUser(),reference=(new URL(req.url).searchParams.get("reference")||"").trim();
  if(!reference||reference.length>180)return NextResponse.json({ok:false,error:"Invalid transaction reference."},{status:400});
  const transactions=await collection<any>("coinTransactions");
  const transaction=await transactions.findOne({userId:String(user.id),reference,type:"credit"});
  if(!transaction)return NextResponse.json({ok:false,error:"A credited wallet transaction was not found."},{status:404});
  const payments=await collection<any>("payments");
  const payment=await payments.findOne({userId:String(user.id),$or:[{orderId:reference},{providerId:reference}]});
  const receiptId=String(payment?.receiptId||transaction.receiptId||("NX-"+crypto.createHash("sha256").update(String(transaction._id)).digest("hex").slice(0,16).toUpperCase()));
  if(payment&&!payment.receiptId)await payments.updateOne({_id:payment._id,receiptId:{$exists:false}},{$set:{receiptId}});
  if(!transaction.receiptId)await transactions.updateOne({_id:transaction._id,receiptId:{$exists:false}},{$set:{receiptId}});
  const pricing=await getSettings(),rate=Number(pricing.coinsPerUsd)||100;
  const amountUsd=Number(payment?.amountUsd??(Number(transaction.amount||0)/rate));
  const paidAt=payment?.paidAt||payment?.smsMatchedAt||transaction.createdAt;
  const method=String(payment?.methodName||payment?.method||payment?.provider||transaction.description||"Numelixa wallet credit");
  const verification=payment?.provider==="ebirr_manual"
   ?"Incoming payment SMS, sender number, exact amount, receiving SIM and unique transaction reference matched."
   :"A matching credit entry was posted to the Numelixa wallet ledger after payment processing.";
  return NextResponse.json({ok:true,receipt:{
   receiptId,orderId:reference,service:method,payerPhone:String(payment?.smsPayerPhone||payment?.payerPhone||""),
   receiverPhone:String(payment?.receiverPhone||""),transactionReference:String(payment?.transactionReference||payment?.txid||reference),
   amountEtb:Number(payment?.amountEtb||0),amountUsd:Number.isFinite(amountUsd)?amountUsd:0,
   exchangeRate:Number(payment?.exchangeRate||0),walletCredit:Number(transaction.amount||0),
   balanceAfter:transaction.balanceAfter==null?null:Number(transaction.balanceAfter),
   paidAt:paidAt?new Date(paidAt).toISOString():null,status:"VERIFIED",verification
  }},{headers:{"Cache-Control":"no-store"}});
 }catch(error){
  if(error instanceof Error&&error.message==="AUTH_REQUIRED")return NextResponse.json({ok:false,error:"Sign in to view this receipt."},{status:401});
  console.error("[WALLET RECEIPT]",error);
  return NextResponse.json({ok:false,error:"Unable to load this wallet receipt."},{status:500});
 }
}
