import {NextResponse} from "next/server";import {collection,mongoId} from "@/lib/mongo";import {createSession,requestMeta} from "@/lib/auth";import {getAuthSettings} from "@/lib/auth-methods";import {getAuthSettings} from "@/lib/auth-methods";import {claimDeviceTokenForUser} from "@/lib/notifications";import crypto from "crypto";
export const runtime="nodejs";export const dynamic="force-dynamic";
const hash=(v:string)=>crypto.createHash("sha256").update(v).digest("hex");
export async function POST(req:Request){
 try{
  if(!(await getAuthSettings()).phoneEnabled)return NextResponse.json({ok:false,error:"Phone sign in is currently unavailable."},{status:403});
  if(!(await getAuthSettings()).phoneEnabled)return NextResponse.json({ok:false,error:"Phone sign in is currently unavailable."},{status:403});
  const b=await req.json().catch(()=>({})),phone=String(b.phone||"").trim(),code=String(b.code||"").trim(),name=String(b.name||"").trim();
  if(!/^\+[1-9]\d{7,14}$/.test(phone)||!/^[0-9]{6}$/.test(code))return NextResponse.json({ok:false,error:"Enter the phone number and 6-digit code."},{status:400});
  const otps=await collection<any>("phoneOtps"),t=await otps.findOne({phone,codeHash:hash(code),expiresAt:{$gt:new Date()}});
  if(!t)return NextResponse.json({ok:false,error:"Invalid or expired verification code."},{status:400});
  const users=await collection<any>("users");let u=await users.findOne({phone});
  if(t.purpose==="signup"){
   if(u)return NextResponse.json({ok:false,error:"This phone number is already registered."},{status:409});
   const id=mongoId();await users.insertOne({_id:id,phone,name:name||t.name||"Numelixa user",email:null,password_hash:null,role:"user",coins:0,verifiedAt:new Date(),phoneVerifiedAt:new Date(),createdAt:new Date()});u=await users.findOne({_id:id});
  }else{if(!u)return NextResponse.json({ok:false,error:"Account not found."},{status:404});await users.updateOne({_id:u._id},{$set:{phoneVerifiedAt:new Date()}})}
  await otps.deleteOne({_id:t._id});await createSession(String(u._id),requestMeta(req.headers));await claimDeviceTokenForUser(String(u._id));
  return NextResponse.json({ok:true,role:u.role});
 }catch(e){return NextResponse.json({ok:false,error:e instanceof Error?e.message:"Phone verification failed"},{status:500})}
}
