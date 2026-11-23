import crypto from "crypto";
import {collection,mongoId} from "@/lib/mongo";
import {sendPush} from "@/lib/push";
import {requestMeta,createSession} from "@/lib/auth";
import {sendTransactionalEmail} from "@/lib/email-system";

export type LoginApprovalStatus="pending"|"approved"|"denied"|"expired";

export async function notifyNewLogin(userId:string,email:string,name:string,h:Headers){
 const meta=requestMeta(h);
 const deviceKey=String(meta.deviceId||"").trim()||[meta.platform,meta.device,meta.browser,meta.userAgent].join("|");
 const fingerprint=crypto.createHash("sha256").update(deviceKey).digest("hex");
 const users=await collection<any>("users");
 const user=await users.findOne({_id:String(userId)},{projection:{lastLoginDeviceHash:1}});
 if(String(user?.lastLoginDeviceHash||"")===fingerprint)return {sent:false,reason:"known-device"};
 await users.updateOne({_id:String(userId)},{$set:{lastLoginDeviceHash:fingerprint,lastLoginAt:new Date(),lastLoginIp:meta.ip||"",lastLoginDevice:meta.device||"",lastLoginPlatform:meta.platform||"",lastLoginBrowser:meta.browser||""}});
 const location=[meta.city,meta.region,meta.country].filter(Boolean).join(", ")||"Location unavailable";
 try{
  const devices=await (await collection<any>("deviceTokens")).find({
   userId:String(userId),platform:"android",
   updatedAt:{$gte:new Date(Date.now()-30*24*60*60*1000)}
  }).toArray();
  if(devices.length){
   const push=await sendPush(
    devices.map(x=>String(x.token||"")).filter(Boolean),
    "New sign-in detected",
    "Your Numelixa account was accessed from "+(meta.device||"a new device")+" · "+location,
    {type:"security",url:"/security"}
   );
   if(push.invalidTokens?.length)await (await collection<any>("deviceTokens")).deleteMany({token:{$in:push.invalidTokens}});
  }
  await sendTransactionalEmail("login_security_alert",email,{
   USER_NAME:name||"there",LOGIN_DATE:new Date().toISOString(),
   DEVICE_INFO:meta.device||"Unknown device",PLATFORM_INFO:meta.platform||"Unknown platform",
   BROWSER_INFO:meta.browser||"Unknown browser",LOGIN_IP:meta.ip||"Not available",
   LOCATION_INFO:location,SECURITY_URL:"https://numelixa.com/security"
  },"login-alert:"+String(userId)+":"+fingerprint);
  return {sent:true};
 }catch(error){
  console.error("[LOGIN SECURITY EMAIL]",error instanceof Error?error.message:"send failed");
  return {sent:false,reason:"email-failed"};
 }
}

export async function extraSecurityEnabled(){
 const s=await (await collection<any>("settings")).findOne({_id:"security"});
 return String(s?.loginSecurity||"normal").toLowerCase()==="extra";
}

export async function setLoginSecurity(mode:"normal"|"extra"){
 await (await collection<any>("settings")).updateOne({_id:"security"},{$set:{loginSecurity:mode,updatedAt:new Date()}},{upsert:true});
}

export async function createLoginApproval(userId:string,h:Headers){
 const meta=requestMeta(h);
 const id=crypto.randomBytes(32).toString("hex");
 const now=new Date();
 const expiresAt=new Date(now.getTime()+2*60*1000);
 const approvals=await collection<any>("loginApprovals");
 await approvals.insertOne({_id:mongoId(),approvalId:id,userId:String(userId),status:"pending",createdAt:now,expiresAt,ip:meta.ip||"",city:meta.city||"",country:meta.country||"",region:meta.region||"",device:meta.device||"Browser",browser:meta.browser||"Browser",platform:meta.platform||"Other",userAgent:meta.userAgent||""});

 const devices=await (await collection<any>("deviceTokens")).find({
   userId:String(userId),
   platform:"android",
   updatedAt:{$gte:new Date(Date.now()-30*24*60*60*1000)}
 }).toArray();

 if(!devices.length){
   await approvals.updateOne({approvalId:id},{$set:{deliveryStatus:"NO_MOBILE_DEVICE"}});
   return {approvalId:id,expiresAt,deviceCount:0,pushSent:0};
 }

 const location=[meta.city,meta.country].filter(Boolean).join(", ")||"Location unavailable";
 const result=await sendPush(
   devices.map(x=>String(x.token||"")),
   "🔐 New login request",
   "Approve sign-in from "+(meta.device||"browser")+" · "+location,
   {url:"/login-approval?approvalId="+id,type:"login_approval",approvalId:id,device:meta.device||"Browser",browser:meta.browser||"Browser",platform:meta.platform||"Other",city:meta.city||"",country:meta.country||""}
 );
 if(result.invalidTokens?.length)await (await collection<any>("deviceTokens")).deleteMany({token:{$in:result.invalidTokens}});
 if(result.successCount===0){
   await approvals.updateOne({approvalId:id},{$set:{deliveryStatus:"PUSH_NOT_DELIVERED",pushErrors:result.errors||[]}});
 }
 return {approvalId:id,expiresAt,deviceCount:devices.length,pushSent:result.successCount};
}

export async function getLoginApproval(approvalId:string){
 const row=await (await collection<any>("loginApprovals")).findOne({approvalId});
 if(!row)return null;
 if(row.status==="pending"&&new Date(row.expiresAt).getTime()<=Date.now()){
   await (await collection<any>("loginApprovals")).updateOne({_id:row._id,status:"pending"},{$set:{status:"expired"}});
   row.status="expired";
 }
 return {
   id:String(row.approvalId),
   userId:String(row.userId||""),
   status:row.status as LoginApprovalStatus,
   createdAt:row.createdAt,
   expiresAt:row.expiresAt,
   device:row.device,
   browser:row.browser,
   platform:row.platform,
   city:row.city,
   country:row.country,
   region:row.region,
   deniedReason:row.deniedReason||""
 };
}

export async function resolveLoginApproval(approvalId:string,approve:boolean){
 const approvals=await collection<any>("loginApprovals");
 const row=await approvals.findOne({approvalId,status:"pending"});
 if(!row)return {ok:false,status:"expired"};
 if(new Date(row.expiresAt).getTime()<=Date.now()){
   await approvals.updateOne({_id:row._id},{$set:{status:"expired"}});
   return {ok:false,status:"expired"};
 }
 const status=approve?"approved":"denied";
 await approvals.updateOne({_id:row._id},{$set:{status,resolvedAt:new Date()}});
 return {ok:true,status,userId:String(row.userId)};
}
