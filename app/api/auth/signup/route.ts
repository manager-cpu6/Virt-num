import {NextResponse} from "next/server";
import {collection,mongoId} from "@/lib/mongo";
import {createSession,passwordHash,tokenHash,requestMeta} from "@/lib/auth";
import {claimDeviceTokenForUser} from "@/lib/notifications";
import {issueApiKey} from "@/lib/api-key";
import {sendEmail,verificationEmail} from "@/lib/mailer";
export const runtime="nodejs";
export const dynamic="force-dynamic";

export async function POST(req:Request){
 try{
  const b=await req.json(),name=String(b.name||"").trim(),email=String(b.email||"").trim().toLowerCase(),password=String(b.password||"");
  const termsAccepted=b.termsAccepted===true,termsVersion=String(b.termsVersion||"");
  if(!termsAccepted)return NextResponse.json({ok:false,error:"Please accept the Terms & Conditions to continue."},{status:400});
  if(termsVersion!=="2026-10-10")return NextResponse.json({ok:false,error:"Please review and accept the current Terms & Conditions."},{status:400});
  if(name.length<2||!email.includes("@")||password.length<8)return NextResponse.json({ok:false,error:"Enter valid details. Password must be 8+ characters."},{status:400});
  const users=await collection<any>("users");
  if(await users.findOne({email}))return NextResponse.json({ok:false,error:"Email already registered."},{status:409});
  const id=mongoId(),acceptedAt=new Date();
  await users.insertOne({_id:id,email,name,password_hash:await passwordHash(password),role:"user",coins:0,verifiedAt:null,createdAt:acceptedAt,termsAcceptedAt:acceptedAt,termsVersion,privacyPolicyAcknowledgedAt:acceptedAt});
  await issueApiKey(id,"Production API key");
  await createSession(id,requestMeta(req.headers));
  await claimDeviceTokenForUser(id);
  const now=new Date(),code=String(Math.floor(100000+Math.random()*900000));
  await users.updateOne({_id:id},{$set:{verificationEmailLastAttemptAt:now}});
  try{
   await sendEmail(email,"Your Numelixa verification code",verificationEmail(code));
   await (await collection("emailTokens")).insertOne({_id:mongoId(),tokenHash:tokenHash(code),userId:id,type:"email_verify_code",expiresAt:new Date(Date.now()+10*60*1000),createdAt:now});
  }catch(e){console.error("[SIGNUP EMAIL]",e instanceof Error?e.message:String(e))}
  return NextResponse.json({ok:true,verificationRequired:true});
 }catch(e){return NextResponse.json({ok:false,error:e instanceof Error?e.message:"Signup failed"},{status:500})}
}
