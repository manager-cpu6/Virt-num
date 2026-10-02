import {cookies} from "next/headers";import crypto from "crypto";import bcrypt from "bcryptjs";import {collection,mongoId} from "./mongo";
const COOKIE="numelixa_session";
const hash=(v:string)=>crypto.createHash("sha256").update(v).digest("hex");
export async function createSession(userId:string){
 const raw=crypto.randomBytes(32).toString("hex");
 await (await collection("sessions")).insertOne({tokenHash:hash(raw),userId,expiresAt:new Date(Date.now()+30*24*60*60*1000),createdAt:new Date()});
 (await cookies()).set(COOKIE,raw,{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",path:"/",maxAge:60*60*24*30});
}
export async function getUser(){
 const raw=(await cookies()).get(COOKIE)?.value;if(!raw)return null;
 const s=await (await collection<any>("sessions")).findOne({tokenHash:hash(raw),expiresAt:{$gt:new Date()}});
 if(!s)return null;
 const u=await (await collection<any>("users")).findOne({_id:s.userId});
 if(!u)return null;
 return {id:String(u._id),email:u.email,name:u.name,role:u.role,coins:Number(u.coins||0),verified_at:u.verifiedAt||null};
}
export async function requireUser(){const u=await getUser();if(!u)throw new Error("AUTH_REQUIRED");return u}
export async function requireAdmin(){const u=await requireUser();if(u.role!=="admin")throw new Error("ADMIN_REQUIRED");return u}
export async function logout(){const raw=(await cookies()).get(COOKIE)?.value;if(raw)await (await collection("sessions")).deleteOne({tokenHash:hash(raw)});(await cookies()).delete(COOKIE)}
export async function passwordHash(p:string){return bcrypt.hash(p,12)}
export async function passwordCheck(p:string,h:string){return bcrypt.compare(p,h)}
export function tokenHash(v:string){return hash(v)}
export {mongoId};
