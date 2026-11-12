import {NextResponse} from "next/server";
import {collection} from "@/lib/mongo";
import {getSettings} from "@/lib/settings";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function GET(req:Request){
 try{
  const code=(new URL(req.url).searchParams.get("code")||"").trim().toUpperCase();
  if(!/^NX-[A-F0-9]{16}$/.test(code))return NextResponse.json({ok:false,valid:false,error:"Enter a valid Numelixa receipt code."},{status:400});
  const payments=await collection<any>("payments"),payment=await payments.findOne({receiptId:code,status:"paid"});
  const transactions=await collection<any>("coinTransactions");
  const transaction=payment
   ?await transactions.findOne({userId:String(payment.userId),reference:String(payment.orderId||payment.providerId||""),type:"credit"})
   :await transactions.findOne({receiptId:code,type:"credit"});
  if(!transaction)return NextResponse.json({ok:true,valid:false,receiptId:code},{headers:{"Cache-Control":"no-store"}});
  const service=String(payment?.methodName||payment?.method||payment?.provider||transaction.description||"Numelixa wallet credit");
  const pricing=await getSettings(),rate=Number(pricing.coinsPerUsd)||100;
  const amountUsd=Number(payment?.amountUsd??(Number(transaction.amount||0)/rate));
  const amountEtb=Number(payment?.amountEtb||0);
  const paidAt=payment?.paidAt||payment?.smsMatchedAt||transaction.createdAt||null;
  const reference=String(payment?.transactionReference||payment?.txid||payment?.orderId||"");
  return NextResponse.json({ok:true,valid:true,receipt:{receiptId:code,service,amountUsd,amountEtb,paidAt:paidAt?new Date(paidAt).toISOString():null,referenceSuffix:reference?reference.slice(-6):""}},{headers:{"Cache-Control":"no-store"}});
 }catch(error){console.error("[PUBLIC RECEIPT VERIFY]",error);return NextResponse.json({ok:false,valid:false,error:"Unable to verify this receipt right now."},{status:500});}
}
