import {NextResponse} from "next/server";
import {applyReferralReward} from "@/lib/referrals";
import crypto from "crypto";
import {collection,mongoId} from "@/lib/mongo";
import {notifyUser} from "@/lib/notifications";
import {sendTransactionalEmail} from "@/lib/email-system";

export const runtime="nodejs";
export const dynamic="force-dynamic";

function sortObject(value:any):any{
 if(Array.isArray(value))return value.map(sortObject);
 if(value&&typeof value==="object")return Object.keys(value).sort().reduce((a,k)=>{a[k]=sortObject(value[k]);return a},{} as Record<string,any>);
 return value;
}
function validSignature(body:any,signature:string,secret:string){
 const expected=crypto.createHmac("sha512",secret).update(JSON.stringify(sortObject(body))).digest("hex");
 const a=Buffer.from(expected,"utf8"),b=Buffer.from(signature,"utf8");
 return a.length===b.length&&crypto.timingSafeEqual(a,b);
}
export async function POST(req:Request){
 try{
  const secret=String(process.env.NOWPAYMENTS_IPN_SECRET||"").trim();
  if(!secret)return NextResponse.json({ok:false,error:"IPN is not configured."},{status:503});
  const body:any=await req.json(),signature=req.headers.get("x-nowpayments-sig")||"";
  if(!signature||!validSignature(body,signature,secret))return NextResponse.json({ok:false,error:"Invalid signature"},{status:401});
  const orderId=String(body.order_id||""); if(!orderId)return NextResponse.json({ok:true});
  const payments=await collection<any>("payments"),p=await payments.findOne({orderId,provider:"nowpayments"});
  if(!p)return NextResponse.json({ok:true});
  const status=String(body.payment_status||"").toLowerCase();
  if(["failed","expired","refunded"].includes(status)){
   await payments.updateOne({_id:p._id,status:{$ne:"paid"}},{$set:{status,raw:body,updatedAt:new Date(),txid:String(body.payment_id||p.txid||"")}});
   try{const owner=await (await collection<any>("users")).findOne({_id:String(p.userId)},{projection:{email:1,name:1}});if(owner?.email)await sendTransactionalEmail("payment_failed",String(owner.email),{USER_NAME:String(owner.name||"there"),AMOUNT:Number(p.amountUsd||0).toFixed(2),CURRENCY:"USD",TRANSACTION_ID:String(body.payment_id||p.orderId),PAYMENT_DATE:new Date().toISOString(),RETRY_URL:"https://numelixa.com/wallet"},"payment-failed:nowpayments:"+String(p.orderId));}catch(error){console.error("[NOWPAYMENTS PAYMENT FAILED EMAIL]",error instanceof Error?error.message:"send failed")}
   return NextResponse.json({ok:true});
  }
  if(status!=="finished"){
   await payments.updateOne({_id:p._id,status:{$ne:"paid"}},{$set:{status,raw:body,updatedAt:new Date(),txid:String(body.payment_id||p.txid||"")}});
   return NextResponse.json({ok:true});
  }
  if(Number(body.price_amount)>0&&Math.abs(Number(body.price_amount)-Number(p.amountUsd))>0.01)return NextResponse.json({ok:false,error:"Amount mismatch"},{status:400});
  const claimed=await payments.findOneAndUpdate({_id:p._id,status:{$ne:"paid"}},{$set:{status:"paid",txid:String(body.payment_id||p.txid||""),providerId:String(body.payment_id||p.providerId||""),raw:body,paidAt:new Date(),updatedAt:new Date()}},{returnDocument:"before"});
  if(!claimed)return NextResponse.json({ok:true});
  const users=await collection<any>("users"),u=await users.findOneAndUpdate({_id:p.userId},{$inc:{coins:Number(p.coins)}},{returnDocument:"after"});
  if(!u)throw new Error("Payment user not found");
  await (await collection("coinTransactions")).insertOne({_id:mongoId(),userId:p.userId,type:"credit",amount:Number(p.coins),balanceAfter:Number(u.coins),reference:p.orderId,description:"NOWPayments wallet top-up",createdAt:new Date()});
  try{await applyReferralReward({userId:String(p.userId),paymentReference:String(p.orderId),amountUsd:Number(p.amountUsd||0),description:"Verified wallet top-up"});}catch(error){console.error("[REFERRAL REWARD]",error)}
  try{await notifyUser(String(p.userId),"💰 Payment confirmed","Your wallet was credited with $"+Number(p.amountUsd||0).toFixed(2)+" USD.",{paymentId:String(p._id),type:"payment"});}catch(error){console.error("[NOWPAYMENTS PUSH]",error);}
  try{const paidUser=await users.findOne({_id:p.userId},{projection:{email:1,name:1}});if(paidUser?.email)await sendTransactionalEmail("wallet_deposit_success",String(paidUser.email),{USER_NAME:String(paidUser.name||"there"),AMOUNT:Number(p.amountUsd||0).toFixed(2),CURRENCY:"USD",NEW_BALANCE:"Your updated Numelixa wallet balance",DEPOSIT_ID:String(body.payment_id||p.orderId),DEPOSIT_DATE:new Date().toISOString(),PAYMENT_SOURCE:"Crypto · "+String(body.pay_currency||body.price_currency||"Crypto"),WALLET_URL:"https://numelixa.com/wallet"},"wallet-deposit:nowpayments:"+String(p.orderId));}catch(error){console.error("[NOWPAYMENTS PAYMENT EMAIL]",error instanceof Error?error.message:"send failed");}
  return NextResponse.json({ok:true});
 }catch(e){console.error("[NOWPAYMENTS WEBHOOK]",e);return NextResponse.json({ok:false,error:"Webhook failed"},{status:500});}
}