import {NextResponse} from "next/server";
import {requireUser,tokenHash,mongoId} from "@/lib/auth";
import {collection} from "@/lib/mongo";
import {sendEmail,verificationEmail} from "@/lib/mailer";

export const runtime="nodejs";
export const dynamic="force-dynamic";

const TTL_MS=10*60*1000;

export async function POST(req:Request){
 try{
  const body=await req.json().catch(()=>({}));
  const resend=body?.resend===true;
  const u=await requireUser();
  const users=await collection<any>("users");
  const fresh=await users.findOne({_id:u.id});
  if(fresh?.verifiedAt)return NextResponse.json({ok:true,verified:true});

  const tokens=await collection<any>("emailTokens");
  const now=new Date();

  const lastAttempt=new Date(fresh?.verificationEmailLastAttemptAt||0).getTime();
  const attemptAge=now.getTime()-lastAttempt;
  const latest=await tokens.findOne(
   {userId:u.id,type:"email_verify_code"},
   {sort:{createdAt:-1}}
  );

  // A recent successful/failed send attempt should not be hammered by
  // repeated taps. If a valid token exists, the page can simply reuse it.
  if(!latest&&attemptAge>=0&&attemptAge<60*1000){
   const retryAfter=Math.ceil((60*1000-attemptAge)/1000);
   return NextResponse.json({
    ok:false,
    error:"Please wait "+retryAfter+" seconds before requesting another code.",
    retryAfter
   },{status:429,headers:{"Retry-After":String(retryAfter)}});
  }
  if(resend&&attemptAge>=0&&attemptAge<60*1000){
   const retryAfter=Math.ceil((60*1000-attemptAge)/1000);
   return NextResponse.json({
    ok:false,
    error:"Please wait "+retryAfter+" seconds before requesting another code.",
    retryAfter
   },{status:429,headers:{"Retry-After":String(retryAfter)}});
  }

  // Opening the verification page must never invalidate a code that was
  // already sent by signup.
  if(latest&&!resend&&new Date(latest.expiresAt).getTime()>now.getTime()){
   return NextResponse.json({
    ok:true,
    expiresAt:new Date(latest.expiresAt).toISOString(),
    reused:true
   });
  }

  // Prevent accidental resend loops from the UI or a double-tap. This also
  // protects the Private Email mailbox from unnecessary traffic.
  if(resend&&latest){
   const age=now.getTime()-new Date(latest.createdAt||0).getTime();
   const cooldownMs=60*1000;
   if(age>=0&&age<cooldownMs){
    const retryAfter=Math.ceil((cooldownMs-age)/1000);
    return NextResponse.json({
      ok:false,
      error:"Please wait "+retryAfter+" seconds before requesting another code.",
      retryAfter
    },{status:429,headers:{"Retry-After":String(retryAfter)}});
   }
  }

  const code=String(Math.floor(100000+Math.random()*900000));
  const expiresAt=new Date(Date.now()+TTL_MS);

  // Send first. Only replace the stored token after the provider accepts the
  // message. This prevents an SMTP failure from leaving the user with a code
  // that was never delivered.
  await (await collection<any>("users")).updateOne({_id:u.id},{$set:{verificationEmailLastAttemptAt:now}});

  try{
   await sendEmail(u.email,"Your Numelixa verification code",verificationEmail(code));
  }catch(error){
   const message=error instanceof Error?error.message:String(error);
   if(message.startsWith("EMAIL_RATE_LIMITED:")){
    return NextResponse.json({
      ok:false,
      error:"Email delivery is temporarily rate-limited. Please wait a little and try again.",
      retryAfter:60
    },{status:429,headers:{"Retry-After":"60"}});
   }
   console.error("[EMAIL VERIFICATION SEND]",message);
   return NextResponse.json({ok:false,error:"We could not send the verification email. Please try again."},{status:503});
  }

  await tokens.deleteMany({userId:u.id,type:"email_verify_code"});
  await tokens.insertOne({
   _id:mongoId(),
   tokenHash:tokenHash(code),
   userId:u.id,
   type:"email_verify_code",
   expiresAt,
   createdAt:now
  });
  return NextResponse.json({ok:true,expiresAt:expiresAt.toISOString(),reused:false});
 }catch(e){
  const m=e instanceof Error?e.message:"Verification failed";
  return NextResponse.json({ok:false,error:m},{status:m==="AUTH_REQUIRED"?401:500});
 }
}