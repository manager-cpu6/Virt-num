import {NextResponse} from "next/server";
import crypto from "crypto";
import {requireAdmin} from "@/lib/auth";
import {collection,getMongoClient,mongoId} from "@/lib/mongo";
import {notifyUser} from "@/lib/notifications";
export const runtime="nodejs";export const dynamic="force-dynamic";
export async function GET(){
 try{
  await requireAdmin();
  const settings=await (await collection<any>("settings")).findOne({_id:"payments"});
  const [orders,events]=await Promise.all([(await collection<any>("payments")).find({provider:"ebirr_manual"}).sort({createdAt:-1}).limit(100).toArray(),(await collection<any>("ebirrSmsEvents")).find({}).sort({receivedAt:-1}).limit(30).toArray()]);
  return NextResponse.json({ok:true,settings:{open:settings?.ebirrOpen===true,rate:Number(settings?.ebirrRateEtbPerUsd||0),receiver:String(settings?.ebirrReceiver||"+251905881300"),instructions:String(settings?.ebirrInstructions||""),devicePaired:Boolean(settings?.ebirrDeviceTokenHash)},orders:orders.map(p=>({orderId:p.orderId,userId:p.userId,amountUsd:Number(p.amountUsd||0),amountEtb:Number(p.amountEtb||0),rate:Number(p.exchangeRate||0),method:String(p.methodName||p.method||"eBirr"),coins:Number(p.coins||0),payerPhone:p.payerPhone,receiverPhone:p.receiverPhone,status:p.status,transactionReference:p.transactionReference||"",smsMatched:Boolean(p.smsMatched),smsAmount:p.smsAmount??null,smsPayerPhone:p.smsPayerPhone||"",createdAt:p.createdAt,proofSubmittedAt:p.proofSubmittedAt,paidAt:p.paidAt})),events:events.map(e=>({provider:e.provider,amount:e.amount,transactionReference:e.transactionReference,payerPhone:e.payerPhone,simPhone:e.simPhone,simOperator:e.simOperator,matched:e.matched,reason:e.reason,receivedAt:e.receivedAt,rawBody:e.rawBody}))});
 }catch{return NextResponse.json({ok:false,error:"Unauthorized"},{status:401});}
}
export async function POST(req:Request){
 try{
  await requireAdmin();const b:any=await req.json(),action=String(b.action||"");const settings=await collection<any>("settings");
  if(action==="save"){
   const open=b.open===true,rate=Number(b.rate),receiver=String(b.receiver||"").trim().replace(/[\s()-]/g,""),instructions=String(b.instructions||"").trim().slice(0,800);
   if(!Number.isFinite(rate)||rate<=0||rate>100000)return NextResponse.json({ok:false,error:"Enter a valid ETB amount for one USD."},{status:400});
   if(!/^\+?251[79][0-9]{8}$/.test(receiver)&&!/^0[79][0-9]{8}$/.test(receiver))return NextResponse.json({ok:false,error:"Enter a valid Ethiopian eBirr receiving number."},{status:400});
   await settings.updateOne({_id:"payments"},{$set:{ebirrOpen:open,ebirrRateEtbPerUsd:rate,ebirrReceiver:receiver,ebirrInstructions:instructions,updatedAt:new Date()}},{upsert:true});
   return NextResponse.json({ok:true});
  }
  if(action==="pair_device"){
   const token=crypto.randomBytes(32).toString("base64url"),hash=crypto.createHash("sha256").update(token).digest("hex");
   await settings.updateOne({_id:"payments"},{$set:{ebirrDeviceTokenHash:hash,ebirrDevicePairedAt:new Date(),updatedAt:new Date()}},{upsert:true});
   return NextResponse.json({ok:true,deviceToken:token,message:"Copy this pairing token into Ebirr-Numelixa. It is shown once."});
  }
  if(action==="revoke_device"){await settings.updateOne({_id:"payments"},{$unset:{ebirrDeviceTokenHash:"",ebirrDevicePairedAt:""},$set:{updatedAt:new Date()}},{upsert:true});return NextResponse.json({ok:true,message:"The paired Ebirr-Numelixa device has been revoked."});}
  if(action==="review"){
   const orderId=String(b.orderId||"").trim(),decision=String(b.decision||"");
   if(!orderId||!["approve","reject"].includes(decision))return NextResponse.json({ok:false,error:"Choose a valid payment decision."},{status:400});
   const payments=await collection<any>("payments"),order=await payments.findOne({orderId,provider:"ebirr_manual"});
   if(!order)return NextResponse.json({ok:false,error:"eBirr order not found."},{status:404});
   if(order.credited||order.status==="paid")return NextResponse.json({ok:false,error:"This order has already been credited."},{status:409});
   if(decision==="reject"){
    await payments.updateOne({_id:order._id,credited:{$ne:true}},{$set:{status:"rejected",rejectedAt:new Date(),reviewedAt:new Date(),reviewedBy:"admin",updatedAt:new Date()}});
    try{await notifyUser(String(order.userId),"eBirr payment not approved","Your eBirr payment could not be verified. Contact Numelixa support if you believe this is an error.",{type:"payment",orderId});}catch{}
    return NextResponse.json({ok:true,status:"rejected"});
   }
   if(!String(order.transactionReference||"").trim())return NextResponse.json({ok:false,error:"The customer has not submitted a transaction reference."},{status:409});
   if(!order.smsMatched&&b.manualConfirmed!==true)return NextResponse.json({ok:false,error:"No matching incoming SMS was detected. Confirm that you checked the official eBirr transaction record."},{status:409});
   const duplicate=await payments.findOne({provider:"ebirr_manual",transactionReference:order.transactionReference,credited:true,orderId:{$ne:orderId}});
   if(duplicate)return NextResponse.json({ok:false,error:"This eBirr transaction reference has already been credited."},{status:409});
   const session=getMongoClient().startSession();let credited=false;
   try{await session.withTransaction(async()=>{
    const claimed=await payments.findOneAndUpdate({_id:order._id,credited:{$ne:true},status:{$nin:["paid","rejected"]}},{$set:{status:"paid",credited:true,paidAt:new Date(),reviewedAt:new Date(),reviewedBy:"admin",updatedAt:new Date()}},{session,returnDocument:"before"});
    if(!claimed)return;
    const users=await collection<any>("users"),user=await users.findOneAndUpdate({_id:String(order.userId)},{$inc:{coins:Number(order.coins)}},{session,returnDocument:"after"});
    if(!user)throw new Error("Payment user not found");
    await (await collection<any>("coinTransactions")).insertOne({_id:mongoId(),userId:String(order.userId),type:"credit",amount:Number(order.coins),balanceAfter:Number(user.coins),reference:orderId,description:"eBirr ETB manual payment top-up",createdAt:new Date()},{session});
    credited=true;
   });}finally{await session.endSession();}
   if(!credited)return NextResponse.json({ok:false,error:"Payment was already processed by another admin action."},{status:409});
   try{await notifyUser(String(order.userId),"eBirr payment confirmed","Your Numelixa wallet was credited with $"+Number(order.amountUsd).toFixed(2)+" USD.",{type:"payment",orderId});}catch{}
   return NextResponse.json({ok:true,status:"paid",creditedUsd:Number(order.amountUsd)});
  }
  return NextResponse.json({ok:false,error:"Unknown eBirr admin action."},{status:400});
 }catch(e){console.error("[ADMIN EBIRR]",e);return NextResponse.json({ok:false,error:"Unable to update eBirr settings."},{status:500});}
}
