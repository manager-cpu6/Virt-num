import {NextResponse} from "next/server";
import crypto from "crypto";
import {requireUser} from "@/lib/auth";
import {collection} from "@/lib/mongo";

export const runtime="nodejs";
export const dynamic="force-dynamic";

export async function GET(req:Request){
  try{
    const user=await requireUser();
    const orderId=new URL(req.url).searchParams.get("orderId")||"";
    if(!/^etpay_[a-f0-9-]{20,}$/i.test(orderId))
      return NextResponse.json({ok:false,error:"Invalid receipt reference."},{status:400});
    const order=await (await collection<any>("payments")).findOne({
      orderId,provider:"ebirr_manual",userId:String(user.id),status:"paid",credited:true
    });
    if(!order)return NextResponse.json({ok:false,error:"A verified receipt is not available for this payment yet."},{status:404});
    const transaction=await (await collection<any>("coinTransactions")).findOne({
      userId:String(user.id),reference:orderId,type:"credit"
    });
    const paidAt=order.paidAt||order.smsMatchedAt||order.updatedAt||order.createdAt;
    const receiptId=String(order.receiptId||("NX-"+crypto.createHash("sha256").update(orderId).digest("hex").slice(0,16).toUpperCase()));
    if(!order.receiptId)await (await collection<any>("payments")).updateOne({_id:order._id,receiptId:{$exists:false}},{$set:{receiptId}});
    return NextResponse.json({ok:true,receipt:{
      receiptId,orderId,service:String(order.methodName||order.method||"Ethiopia Local Payment"),
      payerName:String(order.smsPayerName||order.payerName||""),payerPhone:String(order.smsPayerPhone||order.payerPhone||""),
      receiverPhone:String(order.receiverPhone||""),transactionReference:String(order.transactionReference||""),
      amountEtb:Number(order.amountEtb||0),amountUsd:Number(order.amountUsd||0),
      exchangeRate:Number(order.exchangeRate||0),walletCredit:Number(order.coins||0),
      balanceAfter:transaction?.balanceAfter==null?null:Number(transaction.balanceAfter),
      paidAt:paidAt?new Date(paidAt).toISOString():null,status:"VERIFIED",
      verification:"Incoming payment SMS, payer name and number, exact amount, receiving SIM and unique transaction reference matched."
    }},{headers:{"Cache-Control":"no-store"}});
  }catch(error){
    if(error instanceof Error&&error.message==="AUTH_REQUIRED")
      return NextResponse.json({ok:false,error:"Sign in to view this receipt."},{status:401});
    console.error("[PAYMENT RECEIPT]",error);
    return NextResponse.json({ok:false,error:"Unable to load the verified receipt."},{status:500});
  }
}
