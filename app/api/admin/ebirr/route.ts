import {NextResponse} from "next/server";
import crypto from "crypto";
import {requireAdmin} from "@/lib/auth";
import {collection,getMongoClient,mongoId} from "@/lib/mongo";
import {notifyUser} from "@/lib/notifications";
export const runtime="nodejs";export const dynamic="force-dynamic";
// Payment service settings are shared by the website checkout and the paired admin APK.
const methodNames:Record<string,string>={coopay_ebirr:"Coopay eBirr",kaafi_ebirr:"Kaafi eBirr",cbe_birr:"CBE Birr",cbe_bank:"CBE Bank Transfer",mpesa:"M-Pesa",telebirr:"Telebirr"};
function methodsFor(s:any){const saved=s?.ethiopiaPaymentMethods||{};return Object.fromEntries(Object.entries(methodNames).map(([id,name])=>{const x=saved[id]||{},legacy=s?.ebirrOpen===true&&id==="coopay_ebirr";return [id,{name,open:typeof x.open==="boolean"?x.open:legacy,receiver:String(x.receiver??(id==="coopay_ebirr"?String(s?.ebirrReceiver||""):"")),instructions:String(x.instructions??s?.ebirrInstructions??"")}];}));}

export async function GET(){
 try{
  await requireAdmin();
  const settings=await (await collection<any>("settings")).findOne({_id:"payments"});
  const [orders,events]=await Promise.all([(await collection<any>("payments")).find({provider:"ebirr_manual"}).sort({createdAt:-1}).limit(100).toArray(),(await collection<any>("ebirrSmsEvents")).find({}).sort({receivedAt:-1}).limit(30).toArray()]);
  return NextResponse.json({ok:true,settings:{open:settings?.ebirrOpen===true,rate:Number(settings?.ebirrRateEtbPerUsd||0),receiver:String(settings?.ebirrReceiver||""),instructions:String(settings?.ebirrInstructions||""),paymentMethods:methodsFor(settings),devicePaired:Boolean(settings?.ebirrDeviceTokenHash)},orders:orders.map(p=>({orderId:p.orderId,userId:p.userId,amountUsd:Number(p.amountUsd||0),amountEtb:Number(p.amountEtb||0),rate:Number(p.exchangeRate||0),method:String(p.methodName||p.method||"eBirr"),coins:Number(p.coins||0),payerPhone:p.payerPhone,payerName:p.payerName||"",smsPayerName:p.smsPayerName||"",receiverPhone:p.receiverPhone,status:p.status,transactionReference:p.transactionReference||"",smsMatched:Boolean(p.smsMatched),smsAmount:p.smsAmount??null,smsPayerPhone:p.smsPayerPhone||"",createdAt:p.createdAt,proofSubmittedAt:p.proofSubmittedAt,paidAt:p.paidAt})),events:events.map(e=>({provider:e.provider,amount:e.amount,transactionReference:e.transactionReference,payerPhone:e.payerPhone,payerName:e.payerName||"",simPhone:e.simPhone,simOperator:e.simOperator,matched:e.matched,reason:e.reason,receivedAt:e.receivedAt,rawBody:e.rawBody}))});
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
  if(action==="save_methods"){
   const input=b.paymentMethods&&typeof b.paymentMethods==="object"?b.paymentMethods:{},rate=Number(b.rate),baseInstructions=String(b.instructions||"").trim().slice(0,800),current=methodsFor(await settings.findOne({_id:"payments"}));
   if(!Number.isFinite(rate)||rate<=0||rate>100000)return NextResponse.json({ok:false,error:"Enter a valid ETB per USD rate."},{status:400});
   const next:Record<string,any>={};
   for(const [id,name] of Object.entries(methodNames)){
    const x=input[id]||current[id],open=x?.open===true,receiver=String(x?.receiver||"").trim().replace(/[\s()+-]/g,"");
    if(open){const bank=id==="cbe_bank",valid=bank?/^[0-9]{10,16}$/.test(receiver):((receiver.length===12&&receiver.startsWith("251")&&["7","9"].includes(receiver[3]))||(receiver.length===10&&receiver.startsWith("0")&&["7","9"].includes(receiver[1])));if(!valid)return NextResponse.json({ok:false,error:"Enter a valid receiving number for "+name+" before opening it."},{status:400});}
    next[id]={name,open,receiver:receiver.startsWith("251")?"+"+receiver:receiver,instructions:String(x?.instructions||baseInstructions).trim().slice(0,800)};
   }
   const e=next.coopay_ebirr;
   await settings.updateOne({_id:"payments"},{$set:{ebirrOpen:e.open,ebirrRateEtbPerUsd:rate,ebirrReceiver:e.receiver,ebirrInstructions:e.instructions,ethiopiaPaymentMethods:next,updatedAt:new Date()}},{upsert:true});
   return NextResponse.json({ok:true,paymentMethods:next});
  }
  if(action==="pair_device"){
   const token=crypto.randomBytes(32).toString("base64url"),hash=crypto.createHash("sha256").update(token).digest("hex");
   await settings.updateOne({_id:"payments"},{$set:{ebirrDeviceTokenHash:hash,ebirrDevicePairedAt:new Date(),updatedAt:new Date()}},{upsert:true});
   return NextResponse.json({ok:true,deviceToken:token,message:"Copy this pairing token into Ebirr-Numelixa. It is shown once."});
  }
  if(action==="revoke_device"){await settings.updateOne({_id:"payments"},{$unset:{ebirrDeviceTokenHash:"",ebirrDevicePairedAt:""},$set:{updatedAt:new Date()}},{upsert:true});return NextResponse.json({ok:true,message:"The paired Ebirr-Numelixa device has been revoked."});}
  if(action==="review"){
   const orderId=String(b.orderId||"").trim(),decision=String(b.decision||"");
   if(!orderId||!["approve","reject","close"].includes(decision))return NextResponse.json({ok:false,error:"Choose a valid payment decision."},{status:400});
   const payments=await collection<any>("payments"),order=await payments.findOne({orderId,provider:"ebirr_manual"});
   if(!order)return NextResponse.json({ok:false,error:"Ethiopia payment order not found."},{status:404});
   if(order.status==="closed")return NextResponse.json({ok:false,error:"This payment order is already closed."},{status:409});
   if(order.credited||order.status==="paid")return NextResponse.json({ok:false,error:"This order has already been credited."},{status:409});
   if(decision==="close"){
    const closed=await payments.updateOne({_id:order._id,credited:{$ne:true},status:{$nin:["paid","rejected","closed"]}},{$set:{status:"closed",closedAt:new Date(),reviewedAt:new Date(),reviewedBy:"admin",updatedAt:new Date()}});
    if(!closed.modifiedCount)return NextResponse.json({ok:false,error:"This payment order can no longer be closed."},{status:409});
    try{await notifyUser(String(order.userId),"Payment order closed","Your Ethiopia payment request was closed by the administrator. No wallet credit was made.",{type:"payment",orderId});}catch{}
    return NextResponse.json({ok:true,status:"closed"});
   }
   if(decision==="reject"){
    await payments.updateOne({_id:order._id,credited:{$ne:true}},{$set:{status:"rejected",rejectedAt:new Date(),reviewedAt:new Date(),reviewedBy:"admin",updatedAt:new Date()}});
    try{await notifyUser(String(order.userId),"Payment not approved","Your Ethiopia payment could not be verified. Contact support if you believe this is an error.",{type:"payment",orderId});}catch{}
    return NextResponse.json({ok:true,status:"rejected"});
   }
   
   if(b.manualConfirmed!==true)return NextResponse.json({ok:false,error:"Explicit administrator confirmation is required after checking the official receiving account."},{status:409});
   if(String(order.transactionReference||"").trim()){
    const duplicate=await payments.findOne({provider:"ebirr_manual",transactionReference:String(order.transactionReference).trim(),credited:true,orderId:{$ne:orderId}});
    if(duplicate)return NextResponse.json({ok:false,error:"This transaction reference has already been credited."},{status:409});
   }
   const session=getMongoClient().startSession();let credited=false;
   try{await session.withTransaction(async()=>{
    const claimed=await payments.findOneAndUpdate({_id:order._id,credited:{$ne:true},status:{$nin:["paid","rejected"]}},{$set:{status:"paid",credited:true,paidAt:new Date(),reviewedAt:new Date(),reviewedBy:"admin",updatedAt:new Date()}},{session,returnDocument:"before"});
    if(!claimed)return;
    const users=await collection<any>("users"),user=await users.findOneAndUpdate({_id:String(order.userId)},{$inc:{coins:Number(order.coins)}},{session,returnDocument:"after"});
    if(!user)throw new Error("Payment user not found");
    await (await collection<any>("coinTransactions")).insertOne({_id:mongoId(),userId:String(order.userId),type:"credit",amount:Number(order.coins),balanceAfter:Number(user.coins),reference:orderId,description:"Ethiopia ETB manual payment top-up",createdAt:new Date()},{session});
    credited=true;
   });}finally{await session.endSession();}
   if(!credited)return NextResponse.json({ok:false,error:"Payment was already processed by another admin action."},{status:409});
   try{await notifyUser(String(order.userId),"eBirr payment confirmed","Your Numelixa wallet was credited with $"+Number(order.amountUsd).toFixed(2)+" USD.",{type:"payment",orderId});}catch{}
   return NextResponse.json({ok:true,status:"paid",creditedUsd:Number(order.amountUsd)});
  }
  return NextResponse.json({ok:false,error:"Unknown eBirr admin action."},{status:400});
 }catch(e){console.error("[ADMIN EBIRR]",e);return NextResponse.json({ok:false,error:"Unable to update eBirr settings."},{status:500});}
}
