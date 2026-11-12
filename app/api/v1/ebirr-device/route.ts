import {NextResponse} from "next/server";
import crypto from "crypto";
import {collection,getMongoClient,mongoId} from "@/lib/mongo";
import {notifyUser} from "@/lib/notifications";
export const runtime="nodejs";
export const dynamic="force-dynamic";
const methodNames:Record<string,string>={coopay_ebirr:"Coopay eBirr",kaafi_ebirr:"Kaafi eBirr",cbe_birr:"CBE Birr",cbe_bank:"CBE Bank Transfer",mpesa:"M-Pesa",telebirr:"Telebirr"};
function tokenMatches(candidate:string,expected:string){if(!candidate||!expected)return false;const a=crypto.createHash("sha256").update(candidate).digest(),b=Buffer.from(expected,"hex");return a.length===b.length&&crypto.timingSafeEqual(a,b);}
function clean(v:string){return v.trim().replace(/[\s()+-]/g,"");}
function methodsFor(s:any){const saved=s?.ethiopiaPaymentMethods||{};return Object.fromEntries(Object.entries(methodNames).map(([id,name])=>{const x=saved[id]||{},legacy=s?.ebirrOpen===true&&id==="coopay_ebirr";return [id,{name,open:typeof x.open==="boolean"?x.open:legacy,receiver:String(x.receiver??(id==="coopay_ebirr"?String(s?.ebirrReceiver||""):"")),instructions:String(x.instructions??s?.ebirrInstructions??"")}];}));}
async function authorize(req:Request){const token=String(req.headers.get("x-numelixa-device-token")||"").trim(),s=await (await collection<any>("settings")).findOne({_id:"payments"});if(!tokenMatches(token,String(s?.ebirrDeviceTokenHash||"")))return null;return s;}
export async function GET(req:Request){
 try{const s=await authorize(req);if(!s)return NextResponse.json({ok:false,error:"Device token is invalid or revoked."},{status:401});
 const [orders,events]=await Promise.all([(await collection<any>("payments")).find({provider:"ebirr_manual"}).sort({createdAt:-1}).limit(150).toArray(),(await collection<any>("ebirrSmsEvents")).find({}).sort({receivedAt:-1}).limit(80).toArray()]);
 return NextResponse.json({ok:true,settings:{open:s.ebirrOpen===true,rate:Number(s.ebirrRateEtbPerUsd||0),receiver:String(s.ebirrReceiver||""),instructions:String(s.ebirrInstructions||""),paymentMethods:methodsFor(s),devicePaired:Boolean(s.ebirrDeviceTokenHash)},orders:orders.map(p=>({orderId:String(p.orderId),userId:String(p.userId),amountUsd:Number(p.amountUsd||0),amountEtb:Number(p.amountEtb||0),rate:Number(p.exchangeRate||0),coins:Number(p.coins||0),method:String(p.methodName||p.method||"eBirr"),methodId:String(p.method||"ebirr"),payerPhone:String(p.payerPhone||""),receiverPhone:String(p.receiverPhone||""),status:String(p.status||"pending"),transactionReference:String(p.transactionReference||""),smsMatched:p.smsMatched===true,smsAmount:p.smsAmount??null,smsPayerPhone:String(p.smsPayerPhone||""),createdAt:p.createdAt??null,paidAt:p.paidAt??null})),events:events.map(e=>({provider:String(e.provider||""),amount:e.amount??null,transactionReference:String(e.transactionReference||""),payerPhone:String(e.payerPhone||""),simPhone:String(e.simPhone||""),simOperator:String(e.simOperator||""),matched:e.matched===true,reason:String(e.reason||""),receivedAt:e.receivedAt??null,rawBody:String(e.rawBody||"")}))});
 }catch(e){console.error("[PAYMENT DEVICE GET]",e);return NextResponse.json({ok:false,error:"Unable to load device dashboard."},{status:500});}
}
export async function POST(req:Request){
 try{if(!await authorize(req))return NextResponse.json({ok:false,error:"Device token is invalid or revoked."},{status:401});const b:any=await req.json(),settings=await collection<any>("settings"),action=String(b.action||"");
 if(action==="save_settings"){
  const rate=Number(b.rate),baseInstructions=String(b.instructions||"").trim().slice(0,800),input=b.paymentMethods&&typeof b.paymentMethods==="object"?b.paymentMethods:{},current=methodsFor(await settings.findOne({_id:"payments"})),next:Record<string,any>={};
  if(!Number.isFinite(rate)||rate<=0||rate>100000)return NextResponse.json({ok:false,error:"Enter a valid ETB per USD rate."},{status:400});
  for(const [id,name] of Object.entries(methodNames)){const x=input[id]||current[id],open=x?.open===true,receiver=clean(String(x?.receiver||""));if(open){const bank=id==="cbe_bank",valid=bank?/^[0-9]{10,16}$/.test(receiver):((receiver.length===12&&receiver.startsWith("251")&&["7","9"].includes(receiver[3]))||(receiver.length===10&&receiver.startsWith("0")&&["7","9"].includes(receiver[1])));if(!valid)return NextResponse.json({ok:false,error:"Enter a valid receiving number for "+name+" before opening it."},{status:400});}next[id]={name,open,receiver:receiver.startsWith("251")?"+"+receiver:receiver,instructions:String(x?.instructions||baseInstructions).trim().slice(0,800)};}
  const e=next.coopay_ebirr;await settings.updateOne({_id:"payments"},{$set:{ebirrOpen:e.open,ebirrRateEtbPerUsd:rate,ebirrReceiver:e.receiver,ebirrInstructions:e.instructions,ethiopiaPaymentMethods:next,updatedAt:new Date()}},{upsert:true});return NextResponse.json({ok:true,paymentMethods:next});
 }
 if(action==="close_order"){const orderId=String(b.orderId||"").trim();if(!orderId)return NextResponse.json({ok:false,error:"Order ID is required."},{status:400});const result=await (await collection<any>("payments")).updateOne({orderId,provider:"ebirr_manual",credited:{$ne:true},status:{$nin:["paid","rejected","closed"]}},{$set:{status:"closed",closedAt:new Date(),updatedAt:new Date(),closedBy:"paired_payment_admin_device"}});if(!result.modifiedCount)return NextResponse.json({ok:false,error:"Order is missing, already paid, or already closed."},{status:409});return NextResponse.json({ok:true,status:"closed"});}
 if(action==="review_order"){
  const orderId=String(b.orderId||"").trim(),decision=String(b.decision||"");
  if(!orderId||!["approve","reject"].includes(decision))return NextResponse.json({ok:false,error:"Choose approve or reject for a valid order."},{status:400});
  const payments=await collection<any>("payments"),order=await payments.findOne({orderId,provider:"ebirr_manual"});
  if(!order)return NextResponse.json({ok:false,error:"Payment order not found."},{status:404});
  if(order.credited||["paid","closed","rejected"].includes(String(order.status)))return NextResponse.json({ok:false,error:"This order has already been processed."},{status:409});
  if(decision==="reject"){
   const changed=await payments.updateOne({_id:order._id,credited:{$ne:true},status:{$nin:["paid","closed","rejected"]}},{$set:{status:"rejected",rejectedAt:new Date(),reviewedAt:new Date(),reviewedBy:"paired_payment_admin_device",updatedAt:new Date()}});
   if(!changed.modifiedCount)return NextResponse.json({ok:false,error:"Order could not be rejected because its status changed."},{status:409});
   try{await notifyUser(String(order.userId),"Payment not approved","Your Ethiopia payment could not be verified. Contact support if you believe this is an error.",{type:"payment",orderId});}catch{}
   return NextResponse.json({ok:true,status:"rejected"});
  }
  if(b.manualConfirmed!==true)return NextResponse.json({ok:false,error:"Confirm that you checked the official receiving account before crediting."},{status:409});
  const ref=String(order.transactionReference||"").trim();
  if(ref){const duplicate=await payments.findOne({provider:"ebirr_manual",transactionReference:ref,credited:true,orderId:{$ne:orderId}});if(duplicate)return NextResponse.json({ok:false,error:"This transaction reference was already credited."},{status:409});}
  const session=getMongoClient().startSession();let credited=false;
  try{await session.withTransaction(async()=>{
   const claimed=await payments.findOneAndUpdate({_id:order._id,credited:{$ne:true},status:{$nin:["paid","closed","rejected"]}},{$set:{status:"paid",credited:true,paidAt:new Date(),reviewedAt:new Date(),reviewedBy:"paired_payment_admin_device",updatedAt:new Date()}},{session,returnDocument:"before"});
   if(!claimed)return;
   const users=await collection<any>("users"),user=await users.findOneAndUpdate({_id:String(order.userId)},{$inc:{coins:Number(order.coins)}},{session,returnDocument:"after"});
   if(!user)throw new Error("Payment user not found");
   await (await collection<any>("coinTransactions")).insertOne({_id:mongoId(),userId:String(order.userId),type:"credit",amount:Number(order.coins),balanceAfter:Number(user.coins),reference:orderId,description:"Ethiopia payment manually verified by paired admin device",createdAt:new Date()},{session});
   credited=true;
  });}finally{await session.endSession();}
  if(!credited)return NextResponse.json({ok:false,error:"Order was processed by another action."},{status:409});
  try{await notifyUser(String(order.userId),"Payment confirmed","Your Numelixa wallet was credited with $"+Number(order.amountUsd).toFixed(2)+" USD.",{type:"payment",orderId});}catch{}
  return NextResponse.json({ok:true,status:"paid",creditedUsd:Number(order.amountUsd)});
 }
 if(action==="revoke_device"){await settings.updateOne({_id:"payments"},{$unset:{ebirrDeviceTokenHash:"",ebirrDevicePairedAt:""},$set:{updatedAt:new Date()}},{upsert:true});return NextResponse.json({ok:true,status:"revoked"});}
 return NextResponse.json({ok:false,error:"Unknown device action."},{status:400});
 }catch(e){console.error("[PAYMENT DEVICE POST]",e);return NextResponse.json({ok:false,error:"Unable to update payment settings."},{status:500});}
}
