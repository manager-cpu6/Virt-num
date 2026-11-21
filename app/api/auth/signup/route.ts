import {NextResponse} from "next/server";
import {collection,mongoId} from "@/lib/mongo";
import {createSession,createMobileSession,passwordHash,tokenHash,requestMeta} from "@/lib/auth";
import {claimDeviceTokenForUser} from "@/lib/notifications";
import {ensureApiKey} from "@/lib/api-key";
import {sendTransactionalEmail} from "@/lib/email-system";
export const runtime="nodejs";
export const dynamic="force-dynamic";

export async function POST(req:Request){
 try{
  const b=await req.json(),name=String(b.name||"").trim(),email=String(b.email||"").trim().toLowerCase(),password=String(b.password||""),referralCode=String(b.ref||b.referralCode||"").trim().toUpperCase().slice(0,24);
  if(name.length<2||!email.includes("@")||password.length<8)return NextResponse.json({ok:false,error:"Enter valid details. Password must be 8+ characters."},{status:400});
  const users=await collection<any>("users");
  const existing=await users.findOne({email});
  if(existing?.verifiedAt)return NextResponse.json({ok:false,error:"This email already has a verified account. Sign in instead."},{status:409});
  const now=new Date();
  const id=existing?String(existing._id):mongoId();
  const createdAccount=!existing;
  if(existing){
    // Reuse the unverified account instead of trapping the address forever.
    // Keep the stable user ID so the existing account's API key remains valid.
    await users.updateOne({_id:existing._id},{$set:{
      name,email,password_hash:await passwordHash(password),role:existing.role||"user",
      verifiedAt:null,verificationEmailLastAttemptAt:now,updatedAt:now
    },$unset:{googleId:""}});
    await (await collection<any>("emailTokens")).deleteMany({userId:id,type:"email_verify_code"});
  }else{
    const referrer=referralCode?await users.findOne({referralCode},{projection:{_id:1}}):null;
    await users.insertOne({_id:id,email,name,password_hash:await passwordHash(password),role:"user",coins:0,verifiedAt:null,createdAt:now,...(referrer&&String(referrer._id)!==id?{referredBy:String(referrer._id),referredAt:now}:{})});

  }
  await ensureApiKey(id);
  if(createdAccount){try{await sendTransactionalEmail("welcome",email,{USER_NAME:name,YEAR:new Date().getFullYear()},"welcome:"+id);}catch(error){console.error("[WELCOME EMAIL]",error instanceof Error?error.message:String(error));}}
  const nativeClient=req.headers.get("x-numelixa-client")==="android-app";
  await createSession(id,requestMeta(req.headers));
  await claimDeviceTokenForUser(id);
  const accessToken=nativeClient?await createMobileSession(id,requestMeta(req.headers)):null;

  const code=String(Math.floor(100000+Math.random()*900000));
  await users.updateOne({_id:id},{$set:{verificationEmailLastAttemptAt:now}});

  // Do not save a verification code until the mail provider accepts it.
  // Otherwise a failed SMTP send would leave the user with an unseen code.
  try{
   await sendTransactionalEmail("otp_verification",email,{USER_NAME:name,OTP_CODE:code,OTP_EXPIRY:"10 minutes",VERIFY_URL:"https://numelixa.com/verify-email",YEAR:new Date().getFullYear()}, "signup:"+id+":"+now.getTime());
   await (await collection("emailTokens")).insertOne({
    _id:mongoId(),
    tokenHash:tokenHash(code),
    userId:id,
    type:"email_verify_code",
    expiresAt:new Date(Date.now()+10*60*1000),
    createdAt:now
   });
  }catch(e){
   console.error("[SIGNUP EMAIL]",e instanceof Error?e.message:String(e));
  }

  return NextResponse.json({ok:true,verificationRequired:true,...(accessToken?{accessToken,user:{id,email,name,role:"user",verified_at:null}}:{})},{headers:{"Cache-Control":"no-store"}});
 }catch(e){return NextResponse.json({ok:false,error:e instanceof Error?e.message:"Signup failed"},{status:500})}
}
