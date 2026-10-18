import {cookies} from "next/headers";
import {collection,mongoId} from "@/lib/mongo";
import {sendPush} from "@/lib/push";

export async function claimDeviceTokenForUser(userId:string){
 const users=await collection<any>("users");
 const account=await users.findOne({_id:String(userId)},{projection:{email:1,pushWelcomeSentAt:1}});
 if(!String(account?.email||"").includes("@"))return false;
 const jar=await cookies();
 const token=String(
  jar.get("numelixa_device_token")?.value||
  jar.get("numelixa_device_token_pending")?.value||
  ""
 ).trim();
 if(token.length<20)return false;

 const devices=await collection<any>("deviceTokens");
 const now=new Date();
 await devices.updateOne(
  {token},
  {$set:{token,userId:String(userId),updatedAt:now,lastSeenAt:now,platform:"android",enabled:true},$setOnInsert:{createdAt:now}},
  {upsert:true}
 );

 try{
  jar.set("numelixa_device_token",token,{
   httpOnly:true,
   secure:process.env.NODE_ENV==="production",
   sameSite:"lax",
   path:"/",
   maxAge:60*60*24*365,
   ...(process.env.NODE_ENV==="production"?{domain:".numelixa.com"}:{})
  });
  jar.delete("numelixa_device_token_pending");
 }catch{}

 if(!account?.pushWelcomeSentAt){
  try{
   const result=await sendPush(
    [token],
    "👋 Welcome to Numelixa",
    "Your Numelixa notifications are now active. We will alert you about SMS codes, purchases, wallet activity and important updates.",
    {type:"welcome",url:"/"}
   );
   if(result.successCount>0){
    await users.updateOne({_id:String(userId)},{$set:{pushWelcomeSentAt:new Date()}});
   }
  }catch(error){
   console.error("[WELCOME PUSH CLAIM]",error instanceof Error?error.message:"Push delivery failed");
  }
 }
 return true;
}

async function deliverPushOutbox(outboxId:string){
 const outbox=await collection<any>("pushOutbox");
 const now=new Date();
 const leaseUntil=new Date(now.getTime()+2*60*1000);
 const job=await outbox.findOneAndUpdate(
  {_id:outboxId,status:"pending",$or:[{lockedUntil:{$exists:false}},{lockedUntil:{$lt:now}}]},
  {$set:{lockedUntil:leaseUntil,lastAttemptAt:now},$inc:{attempts:1}},
  {returnDocument:"after"}
 );
 if(!job)return {sent:0,configured:false,skipped:true};
 const devicesCollection=await collection<any>("deviceTokens");
 const devices=await devicesCollection.find({
  userId:String(job.userId),
  platform:"android",
  enabled:{$ne:false}
 }).toArray();
 const tokens=[...new Set(devices.map((d)=>String(d.token||"").trim()).filter(token=>token.length>=20))];
 let result:Awaited<ReturnType<typeof sendPush>>;
 try{
  result=await sendPush(tokens,String(job.title||"Numelixa"),String(job.message||""),job.data||{});
 }catch(error){
  result={configured:false,successCount:0,failureCount:tokens.length,invalidTokens:[],errors:[{code:"push-send-failed",message:error instanceof Error?error.message:"Push send failed"}]};
 }
 if(result.invalidTokens.length){
  await devicesCollection.deleteMany({token:{$in:result.invalidTokens}});
 }
 if(result.configured&&result.successCount>0){
  const notificationId=mongoId();
  await (await collection<any>("notifications")).updateOne(
   {outboxId:String(job._id)},
   {$setOnInsert:{
    _id:notificationId,
    outboxId:String(job._id),
    userId:String(job.userId),
    title:String(job.title||"Numelixa"),
    message:String(job.message||""),
    createdAt:new Date(),
    readAt:null,
    systemSent:true,
    sentCount:result.successCount,
    failureCount:result.failureCount,
    pushConfigured:true
   }},
   {upsert:true}
  );
  await outbox.updateOne({_id:job._id,status:"pending"},{$set:{
   status:"sent",sentAt:new Date(),sentCount:result.successCount,
   failureCount:result.failureCount,lastError:null
  },$unset:{lockedUntil:""}});
  return {sent:result.successCount,configured:true,failed:result.failureCount};
 }
 const attempts=Number(job.attempts||1);
 const delayMs=tokens.length?Math.min(30*60*1000,10_000*Math.pow(2,Math.min(6,attempts-1))):5*60*1000;
 const error=result.errors?.[0];
 await outbox.updateOne({_id:job._id,status:"pending"},{$set:{
  nextAttemptAt:new Date(Date.now()+delayMs),
  lastError:String(error?.code||(!tokens.length?"no-active-device":"push-not-delivered")).slice(0,120),
  lastErrorMessage:String(error?.message||(!tokens.length?"No active Android device is linked.":"Firebase did not accept the push.")).slice(0,280),
  lastFailureCount:result.failureCount
 },$unset:{lockedUntil:""}});
 return {sent:0,configured:result.configured,failed:result.failureCount};
}

export async function processPushOutbox(limit=25){
 const outbox=await collection<any>("pushOutbox");
 const now=new Date();
 const jobs=await outbox.find({status:"pending",nextAttemptAt:{$lte:now}})
  .sort({nextAttemptAt:1,createdAt:1}).limit(Math.max(1,Math.min(100,limit))).toArray();
 let attempted=0,sent=0,failed=0;
 for(const job of jobs){
  try{
   const result=await deliverPushOutbox(String(job._id));
   if(result.skipped)continue;
   attempted++;
   sent+=result.sent;
   if(!result.sent)failed++;
  }catch(error){
   failed++;
   console.error("[PUSH OUTBOX]",{jobId:String(job._id),message:error instanceof Error?error.message:"Outbox delivery failed"});
  }
 }
 return {attempted,sent,failed};
}

export async function notifyUser(
 userId:string,
 title:string,
 message:string,
 data:Record<string,string>={}
){
 const id=mongoId();
 const now=new Date();
 await (await collection<any>("pushOutbox")).insertOne({
  _id:id,
  userId:String(userId),
  title:String(title).slice(0,120),
  message:String(message).slice(0,1000),
  data:Object.fromEntries(Object.entries({url:"/",...data}).map(([key,value])=>[String(key),String(value)])),
  status:"pending",
  attempts:0,
  createdAt:now,
  nextAttemptAt:now,
  lastError:null
 });
 try{
  const result=await deliverPushOutbox(id);
  return {id:result.sent?id:"",sent:result.sent,pushConfigured:result.configured,failed:result.failed||0,queued:!result.sent};
 }catch(error){
  console.error("[PUSH USER]",{userId:String(userId),message:error instanceof Error?error.message:"Push queue failed"});
  return {id:"",sent:0,pushConfigured:false,failed:1,queued:true};
 }
}
