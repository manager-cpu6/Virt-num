import crypto from "crypto";
import {collection,mongoId} from "@/lib/mongo";
import {sendPush} from "@/lib/push";
import {requestMeta,createSession} from "@/lib/auth";

export type LoginApprovalStatus="pending"|"approved"|"denied"|"expired";

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
   await approvals.updateOne({approvalId:id},{$set:{status:"denied",deniedReason:"NO_MOBILE_DEVICE"}});
   return {approvalId:id,expiresAt,deviceCount:0};
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
   await approvals.updateOne({approvalId:id},{$set:{status:"denied",deniedReason:"PUSH_NOT_DELIVERED",pushErrors:result.errors||[]}});
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
