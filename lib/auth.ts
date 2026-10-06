import {cookies,headers} from "next/headers";
import crypto from "crypto";
import bcrypt from "bcryptjs";
import {collection,mongoId} from "./mongo";
import {authenticateApiKey} from "./api-key";

const COOKIE="numelixa_session";
const hash=(v:string)=>crypto.createHash("sha256").update(v).digest("hex");

export type SessionMeta={
  ip?:string;
  city?:string;
  country?:string;
  region?:string;
  userAgent?:string;
  device?:string;
  browser?:string;
  platform?:string;
};

function requestMeta(h:Headers):SessionMeta{
  const ua=String(h.get("user-agent")||"");
  const ip=String(h.get("x-forwarded-for")||h.get("x-real-ip")||"").split(",")[0].trim();
  const city=String(h.get("x-vercel-ip-city")||"").trim();
  const country=String(h.get("x-vercel-ip-country")||"").trim();
  const region=String(h.get("x-vercel-ip-country-region")||"").trim();
  const platform=/android/i.test(ua)?"Android":/iphone|ipad|ios/i.test(ua)?"iOS":/windows/i.test(ua)?"Windows":/mac os/i.test(ua)?"macOS":/linux/i.test(ua)?"Linux":"Other";
  const device=/android/i.test(ua)?((ua.match(/Android[^;)]*/i)?.[0])||"Android device"):/iphone/i.test(ua)?"iPhone":/ipad/i.test(ua)?"iPad":/windows/i.test(ua)?"Windows PC":/mac os/i.test(ua)?"Mac":"Browser";
  const browser=/edg\//i.test(ua)?"Edge":/chrome\//i.test(ua)?"Chrome":/firefox\//i.test(ua)?"Firefox":/safari\//i.test(ua)&&!/chrome|android/i.test(ua)?"Safari":"Browser";
  return {ip,city,country,region,userAgent:ua,device,browser,platform};
}

export async function ensureAdmin(){
 const email=(process.env.ADMIN_EMAIL||"").trim().toLowerCase(),password=process.env.ADMIN_PASSWORD||"";
 if(!email||!password||!email.includes("@"))return null;
 const users=await collection<any>("users"),existing=await users.findOne({email}),password_hash=await bcrypt.hash(password,12);
 if(!existing){const id=mongoId();await users.insertOne({_id:id,email,name:"Admin",password_hash,role:"admin",coins:0,verifiedAt:new Date(),createdAt:new Date()});return id}
 await users.updateOne({_id:existing._id},{$set:{role:"admin",password_hash,name:existing.name||"Admin"}});
 return String(existing._id);
}

export async function createSession(userId:string,meta?:SessionMeta){
 const raw=crypto.randomBytes(32).toString("hex");
 const now=new Date();
 const sessions=await collection<any>("sessions");
 await sessions.insertOne({
   _id:mongoId(),
   tokenHash:hash(raw),
   userId:String(userId),
   expiresAt:new Date(now.getTime()+30*24*60*60*1000),
   createdAt:now,
   lastSeenAt:now,
   ...meta
 });
 (await cookies()).set(COOKIE,raw,{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",path:"/",maxAge:60*60*24*30});
}

export async function getCurrentSession(){
 const raw=(await cookies()).get(COOKIE)?.value;
 if(!raw)return null;
 const sessions=await collection<any>("sessions");
 const s=await sessions.findOne({tokenHash:hash(raw),expiresAt:{$gt:new Date()}});
 if(!s)return null;
 await sessions.updateOne({_id:s._id},{$set:{lastSeenAt:new Date()}});
 return {...s,tokenHash:undefined};
}

async function sessionUser(userId:string){
 const u=await (await collection<any>("users")).findOne({_id:userId});
 if(!u)return null;
 return {id:String(u._id),email:u.email,name:u.name,role:u.role,coins:Number(u.coins||0),verified_at:u.verifiedAt||null,createdAt:u.createdAt||null};
}

export async function getUser(){
 const h=await headers(),auth=String(h.get("authorization")||"");
 if(auth.toLowerCase().startsWith("bearer ")){
  const userId=await authenticateApiKey(auth.slice(7));if(userId)return sessionUser(userId);
 }
 const apiKey=h.get("x-api-key");
 if(apiKey){const userId=await authenticateApiKey(apiKey);if(userId)return sessionUser(userId)}
 const raw=(await cookies()).get(COOKIE)?.value;
 if(!raw)return null;
 const sessions=await collection<any>("sessions");
 const s=await sessions.findOne({tokenHash:hash(raw),expiresAt:{$gt:new Date()}});
 if(!s)return null;
 await sessions.updateOne({_id:s._id},{$set:{lastSeenAt:new Date()}});
 return sessionUser(String(s.userId));
}

export async function requireUser(){const u=await getUser();if(!u)throw new Error("AUTH_REQUIRED");return u}
export async function requireAdmin(){await ensureAdmin();const u=await requireUser();if(u.role!=="admin")throw new Error("ADMIN_REQUIRED");return u}

export async function logout(){
 const raw=(await cookies()).get(COOKIE)?.value;
 if(raw){
  await (await collection("sessions")).deleteOne({tokenHash:hash(raw)});
  try{
   const deviceToken=String((await cookies()).get("numelixa_device_token")?.value||"").trim();
   if(deviceToken){
    await (await collection("deviceTokens")).updateOne(
     {token:deviceToken},
     {$set:{userId:null,updatedAt:new Date()}}
    );
   }
  }catch(error){console.error("[NOTIFICATION DEVICE UNLINK]",error)}
 }
 (await cookies()).delete(COOKIE);
 (await cookies()).delete("numelixa_device_token");
}

export async function listUserSessions(userId:string){
 const raw=(await cookies()).get(COOKIE)?.value||"";
 const currentHash=raw?hash(raw):"";
 const rows=await (await collection<any>("sessions")).find({userId:String(userId),expiresAt:{$gt:new Date()}}).sort({lastSeenAt:-1}).toArray();
 return rows.map(s=>({
   id:String(s._id),
   current:Boolean(currentHash&&s.tokenHash===currentHash),
   createdAt:s.createdAt,
   lastSeenAt:s.lastSeenAt||s.createdAt,
   expiresAt:s.expiresAt,
   ip:s.ip||"",
   city:s.city||"",
   country:s.country||"",
   region:s.region||"",
   device:s.device||"Browser",
   browser:s.browser||"Browser",
   platform:s.platform||"Other",
   userAgent:s.userAgent||""
 }));
}

export async function revokeUserSession(userId:string,sessionId:string){
 const sessions=await collection<any>("sessions");
 const result=await sessions.deleteOne({_id:sessionId,userId:String(userId)});
 return result.deletedCount===1;
}

export async function revokeOtherSessions(userId:string){
 const raw=(await cookies()).get(COOKIE)?.value;
 if(!raw)return 0;
 const result=await (await collection<any>("sessions")).deleteMany({userId:String(userId),tokenHash:{$ne:hash(raw)}});
 return result.deletedCount;
}

export function passwordHash(p:string){return bcrypt.hash(p,12)}
export function passwordCheck(p:string,h:string){return bcrypt.compare(p,h)}
export function tokenHash(v:string){return hash(v)}
export {mongoId,requestMeta};
