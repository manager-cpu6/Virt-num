import {NextResponse} from "next/server";
import crypto from "crypto";
import {tokenHash} from "@/lib/auth";
import {collection} from "@/lib/mongo";

export const runtime="nodejs";
export const dynamic="force-dynamic";

export async function GET(req:Request){
  try{
    const token=String(req.headers.get("x-ethiopia-checkout-token")||"");
    const orderId=new URL(req.url).searchParams.get("orderId")||"";
    if(!/^[A-Za-z0-9_-]{40,}$/.test(token))return NextResponse.json({ok:false,error:"Invalid checkout access."},{status:401});
    if(!/^etpay_[a-f0-9-]{20,}$/i.test(orderId))
      return NextResponse.json({ok:false,error:"Invalid receipt reference."},{status:400});
    const order=await (await collection<any>("payments")).findOne({
      orderId,provider:"ebirr_manual",checkoutTokenHash:tokenHash(token),status:"paid",credited:true
    });
    if(!order)return NextResponse.json({ok:false,error:"A verified receipt is not available for this payment yet."},{status:404});
    const transaction=await (await collection<any>("coinTransactions")).findOne({
      userId:String(order.userId),reference:orderId,type:"credit"
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
    console.error("[PAYMENT RECEIPT]",error);
    return NextResponse.json({ok:false,error:"Unable to load the verified receipt."},{status:500});
  }
}
