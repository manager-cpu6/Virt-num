import {NextResponse} from "next/server";
import {requireUser} from "@/lib/auth";
import {collection,mongoId,getMongoClient} from "@/lib/mongo";
import {getSettings} from "@/lib/settings";
import {notifyUser} from "@/lib/notifications";
export const runtime="nodejs";
export const dynamic="force-dynamic";
const validUsd=(v:unknown)=>{const n=Number(v);return Number.isFinite(n)&&n>0&&n<=10000&&Math.round(n*100)===n*100;};
const iso=(v:any)=>v?new Date(v).toISOString():null;

export async function GET(){
 try{
  const me=await requireUser();
  const rows=await (await collection<any>("walletRequests")).find({$or:[{requesterId:String(me.id)},{payerId:String(me.id)}]}).sort({createdAt:-1}).limit(100).toArray();
  const ids=[...new Set(rows.flatMap((r:any)=>[String(r.requesterId),String(r.payerId)]))];
  const people=await (await collection<any>("users")).find({_id:{$in:ids}},{projection:{_id:1,name:1,publicId:1}}).toArray();
  const map=new Map(people.map((u:any)=>[String(u._id),u]));
  return NextResponse.json({ok:true,currentUserId:String(me.id),requests:rows.map((r:any)=>{const a=map.get(String(r.requesterId)),b=map.get(String(r.payerId));return{
   id:String(r._id),status:r.status,amountUsd:Number(r.amountUsd),amountCoins:Number(r.amountCoins),
   requester:{id:String(r.requesterId),name:String(a?.name||"Numelixa user"),publicId:String(a?.publicId||"")},
   payer:{id:String(r.payerId),name:String(b?.name||"Numelixa user"),publicId:String(b?.publicId||"")},
   note:String(r.note||""),createdAt:iso(r.createdAt),confirmedAt:iso(r.confirmedAt),receiptId:String(r.receiptId||"")
  };})},{headers:{"Cache-Control":"no-store"}});
 }catch(e){const s=e instanceof Error&&e.message==="AUTH_REQUIRED"?401:500;return NextResponse.json({ok:false,error:s===401?"Please sign in to continue.":"Unable to load wallet requests."},{status:s});}
}

export async function POST(req:Request){
 try{
  const me=await requireUser(),b=await req.json().catch(()=>null);
  const target=String(b?.userId||b?.publicId||"").trim(),amountUsd=Number(b?.amountUsd),note=String(b?.note||"").trim().slice(0,140);
  if(!/^\d{7}$/.test(target)||!validUsd(amountUsd))return NextResponse.json({ok:false,error:"Enter a valid 7-digit Numelixa ID and USD amount."},{status:400});
  const users=await collection<any>("users"),to=await users.findOne({publicId:target},{projection:{_id:1,publicId:1,name:1,role:1,suspendedAt:1}});
  if(!to||to.suspendedAt)return NextResponse.json({ok:false,error:"No active Numelixa account matches that ID."},{status:404});
  const requesterId=String(me.id),payerId=String(to._id);
  if(requesterId===payerId)return NextResponse.json({ok:false,error:"You cannot request money from your own account."},{status:400});
  if(to.role==="admin")return NextResponse.json({ok:false,error:"Money requests to administrator accounts are unavailable."},{status:403});
  const settings=await getSettings(),rate=Number(settings.coinsPerUsd)||100,amountCoins=Math.round(amountUsd*rate);
  if(amountCoins<=0||Math.abs(amountCoins/rate-amountUsd)>0.000001)return NextResponse.json({ok:false,error:"This amount is below the supported wallet precision."},{status:400});
  const now=new Date(),id=mongoId();
  await (await collection<any>("walletRequests")).insertOne({_id:id,requesterId,payerId,amountUsd,amountCoins,note,status:"pending",createdAt:now,updatedAt:now,expiresAt:new Date(now.getTime()+7*86400000)});
  try{await notifyUser(payerId,"Numelixa money request",String(me.name||"A Numelixa user")+" requested $"+amountUsd.toFixed(2)+" USD from your wallet.",{type:"wallet_request",requestId:String(id),url:"/wallet"});}catch(e){console.error("[WALLET REQUEST PUSH]",e);}
  return NextResponse.json({ok:true,request:{id:String(id),status:"pending",amountUsd,recipient:{name:String(to.name||"Numelixa user"),publicId:String(to.publicId)},createdAt:now.toISOString()}},{status:201});
 }catch(e){const s=e instanceof Error&&e.message==="AUTH_REQUIRED"?401:500;return NextResponse.json({ok:false,error:s===401?"Please sign in to continue.":"Unable to create the money request."},{status:s});}
}

export async function PATCH(req:Request){
 try{
  const me=await requireUser(),b=await req.json().catch(()=>null),id=String(b?.requestId||"").trim(),action=String(b?.action||"");
  if(!id||!["reject","confirm"].includes(action))return NextResponse.json({ok:false,error:"Choose Confirm or Reject for a valid request."},{status:400});
  const requests=await collection<any>("walletRequests"),request=await requests.findOne({_id:id,payerId:String(me.id)});
  if(!request)return NextResponse.json({ok:false,error:"This request was not found for your account."},{status:404});
  if(request.status!=="pending")return NextResponse.json({ok:false,error:"This request has already been processed."},{status:409});
  if(request.expiresAt&&new Date(request.expiresAt).getTime()<=Date.now()){await requests.updateOne({_id:id,status:"pending"},{$set:{status:"expired",updatedAt:new Date()}});return NextResponse.json({ok:false,error:"This request has expired."},{status:410});}
  if(action==="reject"){
   const now=new Date(),r=await requests.updateOne({_id:id,payerId:String(me.id),status:"pending"},{$set:{status:"rejected",updatedAt:now,rejectedAt:now}});
   if(!r.modifiedCount)return NextResponse.json({ok:false,error:"This request was already processed."},{status:409});
   try{await notifyUser(String(request.requesterId),"Money request declined","Your $"+Number(request.amountUsd).toFixed(2)+" USD request was declined.",{type:"wallet_request_rejected",requestId:id});}catch(e){console.error("[WALLET REQUEST REJECT PUSH]",e);}
   return NextResponse.json({ok:true,status:"rejected"});
  }
  const settings=await getSettings(),rate=Number(settings.coinsPerUsd)||100,amount=Number(request.amountCoins);
  if(!Number.isSafeInteger(amount)||amount<=0||Math.abs(Number(request.amountUsd)-amount/rate)>0.000001)return NextResponse.json({ok:false,error:"Invalid request amount. Contact Numelixa support."},{status:409});
  const client=getMongoClient(),session=client.startSession(),now=new Date();let receipt:any=null;
  try{await session.withTransaction(async()=>{
   const fresh=await requests.findOne({_id:id,payerId:String(me.id),status:"pending",expiresAt:{$gt:now}},{session});
   if(!fresh)throw new Error("REQUEST_ALREADY_PROCESSED");
   const users=await collection<any>("users"),payer=await users.findOne({_id:String(me.id)},{session}),requester=await users.findOne({_id:String(fresh.requesterId)},{session});
   if(!payer||!requester||payer.suspendedAt||requester.suspendedAt)throw new Error("ACCOUNT_UNAVAILABLE");
   const debit=await users.updateOne({_id:String(me.id),coins:{$gte:amount}},{$inc:{coins:-amount},$set:{updatedAt:now}},{session});
   if(!debit.modifiedCount)throw new Error("INSUFFICIENT_BALANCE");
   const credit=await users.updateOne({_id:String(fresh.requesterId)},{$inc:{coins:amount},$set:{updatedAt:now}},{session});
   if(!credit.modifiedCount)throw new Error("ACCOUNT_UNAVAILABLE");
   const receiptId="NX-TR-"+String(id).replace(/[^a-zA-Z0-9]/g,"").slice(-16).toUpperCase();
   const payerAfter=Number(payer.coins)-amount,requesterAfter=Number(requester.coins)+amount;
   await (await collection<any>("coinTransactions")).insertMany([
    {_id:mongoId(),userId:String(me.id),type:"user_transfer_out",amount:-amount,balanceAfter:payerAfter,reference:id,description:"Money request paid to "+String(requester.publicId||fresh.requesterId),createdAt:now,receiptId},
    {_id:mongoId(),userId:String(fresh.requesterId),type:"user_transfer_in",amount,balanceAfter:requesterAfter,reference:id,description:"Money request received from "+String(payer.publicId||me.publicId||me.id),createdAt:now,receiptId}
   ],{session});
   await requests.updateOne({_id:id,payerId:String(me.id),status:"pending"},{$set:{status:"confirmed",confirmedAt:now,updatedAt:now,receiptId,payerBalanceAfter:payerAfter,requesterBalanceAfter:requesterAfter}},{session});
   receipt={receiptId,requestId:id,amountUsd:Number(fresh.amountUsd),amountCoins:amount,paidBy:{name:String(payer.name||"Numelixa user"),publicId:String(payer.publicId||"")},paidTo:{name:String(requester.name||"Numelixa user"),publicId:String(requester.publicId||"")},paidAt:now.toISOString(),payerBalanceAfter:payerAfter,requesterBalanceAfter:requesterAfter,status:"COMPLETED"};
  });}finally{await session.endSession();}
  try{await notifyUser(String(request.requesterId),"Money received","$"+Number(request.amountUsd).toFixed(2)+" USD has been added to your Numelixa wallet.",{type:"wallet_transfer_received",requestId:id,receiptId:receipt?.receiptId||""});}catch(e){console.error("[WALLET TRANSFER PUSH]",e);}
  return NextResponse.json({ok:true,status:"confirmed",receipt},{headers:{"Cache-Control":"no-store"}});
 }catch(e){
  const m=e instanceof Error?e.message:"",known:Record<string,{status:number,error:string}>={
   AUTH_REQUIRED:{status:401,error:"Please sign in to continue."},
   INSUFFICIENT_BALANCE:{status:409,error:"Your available wallet balance is not enough to confirm this request."},
   REQUEST_ALREADY_PROCESSED:{status:409,error:"This request has already been processed or expired."},
   ACCOUNT_UNAVAILABLE:{status:409,error:"One of these accounts is unavailable. No money was moved."}
  };
  const item=known[m];console.error("[WALLET REQUEST CONFIRM]",m);
  return NextResponse.json({ok:false,error:item?.error||"The transfer could not be completed. No money was moved."},{status:item?.status||500});
 }
}
