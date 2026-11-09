import {NextResponse} from "next/server";
import {collection} from "@/lib/mongo";
import {createSession,createMobileSession,passwordCheck,ensureAdmin,ensureSupportAdmin,requestMeta} from "@/lib/auth";
import {claimDeviceTokenForUser} from "@/lib/notifications";
import {extraSecurityEnabled,createLoginApproval} from "@/lib/login-security";
import {loginIsRateLimited,recordLoginFailure,clearLoginFailure} from "@/lib/auth-rate-limit";

export const runtime="nodejs";export const dynamic="force-dynamic";

export async function POST(req:Request){
 try{
  const b=await req.json(),email=String(b.email||"").trim().toLowerCase(),password=String(b.password||"");
  if(!email||!password)return NextResponse.json({ok:false,error:"Email and password are required."},{status:400});
  if(await loginIsRateLimited(email,req.headers))return NextResponse.json({ok:false,error:"Too many sign-in attempts. Please wait 15 minutes and try again."},{status:429,headers:{"Retry-After":"900","Cache-Control":"no-store"}});
  if(email===(process.env.ADMIN_EMAIL||"").trim().toLowerCase())await ensureAdmin();
  if(email===(process.env.EMAIL_SUPPORT_ADMIN||"").trim().toLowerCase())await ensureSupportAdmin();
  const u=await (await collection<any>("users")).findOne({email});
  if(!u||!(await passwordCheck(password,u.password_hash))){await recordLoginFailure(email,req.headers);return NextResponse.json({ok:false,error:"Invalid email or password."},{status:401,headers:{"Cache-Control":"no-store"}})}
  await clearLoginFailure(email,req.headers);
  if(["support_admin","support_agent"].includes(String(u.role||""))&&u.supportActive===false)return NextResponse.json({ok:false,error:"This support account has been paused. Contact the primary administrator."},{status:403});
  if(u.suspendedAt)return NextResponse.json({ok:false,code:"ACCOUNT_SUSPENDED",error:"Your Numelixa account is suspended. Reason: "+String(u.suspensionReason||"Your account requires review.")+" If you believe this is a mistake, contact https://support.numelixa.com to request a review."},{status:403});

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
  if(nativeClient){
   const accessToken=await createMobileSession(String(u._id),requestMeta(req.headers));
   return NextResponse.json({ok:true,role:u.role,accessToken,user:{id:String(u._id),email:u.email,name:u.name,role:u.role,verified_at:u.verifiedAt||null}},{headers:{"Cache-Control":"no-store"}});
  }
  return NextResponse.json({ok:true,role:u.role});
 }catch(e){
  return NextResponse.json({ok:false,error:e instanceof Error?e.message:"Login failed"},{status:500});
 }
}
