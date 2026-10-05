import {NextResponse} from "next/server";
import {getPaymentSettings} from "@/lib/payment-settings";
import {paypalApi} from "@/lib/paypal";
import {collection,mongoId} from "@/lib/mongo";
import {notifyUser} from "@/lib/notifications";
import crypto from "crypto";
import {paypalBaseUrl} from "@/lib/payment-settings";
export const runtime="nodejs";export const dynamic="force-dynamic";

async function verify(headers:Headers,body:any){
 const s=await getPaymentSettings();if(!s.paypal.webhookId)return false;
 const d:any=await paypalApi("/v1/notifications/verify-webhook-signature",{method:"POST",body:JSON.stringify({auth_algo:headers.get("paypal-auth-algo"),cert_url:headers.get("paypal-cert-url"),transmission_id:headers.get("paypal-transmission-id"),transmission_sig:headers.get("paypal-transmission-sig"),transmission_time:headers.get("paypal-transmission-time"),webhook_id:s.paypal.webhookId,webhook_event:body})});
 return String(d?.verification_status||"").toUpperCase()==="SUCCESS";
}
async function credit(p:any,event:any){
 const payments=await collection<any>("payments"),claimed=await payments.findOneAndUpdate({_id:p._id,status:{$ne:"paid"}},{$set:{status:"paid",txid:String(event?.resource?.id||p.txid||""),raw:event,paidAt:new Date(),updatedAt:new Date()}},{returnDocument:"before"});
 if(!claimed)return;
 const users=await collection<any>("users"),u=await users.findOneAndUpdate({_id:String(p.userId)},{$inc:{coins:Number(p.coins)}},{returnDocument:"after"});if(!u)throw new Error("Payment user not found");
 await (await collection("coinTransactions")).insertOne({_id:mongoId(),userId:String(p.userId),type:"credit",amount:Number(p.coins),balanceAfter:Number(u.coins),reference:p.orderId,description:"PayPal wallet top-up",createdAt:new Date()});
 try{await notifyUser(String(p.userId),"💰 Payment confirmed","Your wallet was credited with "+Number(p.coins).toLocaleString()+" coins.",{paymentId:String(p._id),type:"payment"});}catch(error){console.error("[PAYPAL WEBHOOK PUSH]",error);}
}
export async function POST(req:Request){
 try{
  const body:any=await req.json();if(!(await verify(req.headers,body)))return NextResponse.json({ok:false,error:"Invalid PayPal webhook."},{status:401});
  const event=String(body?.event_type||"");const resource=body?.resource||{};let providerId="";
  if(event==="CHECKOUT.ORDER.APPROVED")providerId=String(resource?.id||"");
  else if(event==="PAYMENT.CAPTURE.COMPLETED")providerId=String(resource?.supplementary_data?.related_ids?.order_id||"");
  if(providerId){const p=await (await collection<any>("payments")).findOne({provider:"paypal",providerId});if(p)await credit(p,body);}
  return NextResponse.json({ok:true});
 }catch(e){console.error("[PAYPAL WEBHOOK]",e);return NextResponse.json({ok:false,error:"Webhook processing failed."},{status:500});}
}
