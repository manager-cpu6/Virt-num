import {NextResponse} from "next/server";
import {collection} from "@/lib/mongo";
import {createSession,passwordCheck,ensureAdmin,requestMeta} from "@/lib/auth";
import {claimDeviceTokenForUser} from "@/lib/notifications";
import {extraSecurityEnabled,createLoginApproval} from "@/lib/login-security";

export const runtime="nodejs";export const dynamic="force-dynamic";

export async function POST(req:Request){
 try{
  const b=await req.json(),email=String(b.email||"").trim().toLowerCase(),password=String(b.password||"");
  if(!email||!password)return NextResponse.json({ok:false,error:"Email and password are required."},{status:400});
  if(email===(process.env.ADMIN_EMAIL||"").trim().toLowerCase())await ensureAdmin();
  const u=await (await collection<any>("users")).findOne({email});
  if(!u||!(await passwordCheck(password,u.password_hash)))return NextResponse.json({ok:false,error:"Invalid email or password."},{status:401});

  const nativeClient=req.headers.get("x-numelixa-client")==="android-app";
  if(await extraSecurityEnabled()&&!nativeClient){
    const approval=await createLoginApproval(String(u._id),req.headers);
    if(!approval.pushSent){
      return NextResponse.json({ok:false,approvalRequired:true,approvalId:approval.approvalId,expiresAt:approval.expiresAt,error:"Open your Numelixa Android app and approve this login request. No approval notification could be delivered."},{status:403});
    }
    return NextResponse.json({ok:false,approvalRequired:true,approvalId:approval.approvalId,expiresAt:approval.expiresAt,message:"Approve this login from your Numelixa Android app."},{status:202});
  }

  await createSession(String(u._id),requestMeta(req.headers));
  await claimDeviceTokenForUser(String(u._id));
  return NextResponse.json({ok:true,role:u.role});
 }catch(e){
  return NextResponse.json({ok:false,error:e instanceof Error?e.message:"Login failed"},{status:500});
 }
}
