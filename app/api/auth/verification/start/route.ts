import {NextResponse} from "next/server";
import {requireUser,tokenHash,mongoId} from "@/lib/auth";
import {collection} from "@/lib/mongo";
import {sendEmail,verificationEmail} from "@/lib/mailer";

export const runtime="nodejs";
export const dynamic="force-dynamic";

const TTL_MS=10*60*1000;

export async function POST(){
 try{
  const u=await requireUser();
  const users=await collection<any>("users");
  const fresh=await users.findOne({_id:u.id});
  if(fresh?.verifiedAt)return NextResponse.json({ok:true,verified:true});

  const tokens=await collection<any>("emailTokens");
  const now=new Date();
  const existing=await tokens.findOne({userId:u.id,type:"email_verify_code",expiresAt:{$gt:now}},{sort:{createdAt:-1}});

  // The signup flow already sends the first code. Do not replace that code
  // when the verification page opens, otherwise the first email becomes invalid.
  if(existing){
   return NextResponse.json({ok:true,expiresAt:new Date(existing.expiresAt).toISOString(),reused:true});
  }

  const code=String(Math.floor(100000+Math.random()*900000));
  const expiresAt=new Date(Date.now()+TTL_MS);
  await tokens.deleteMany({userId:u.id,type:"email_verify_code"});
  await tokens.insertOne({
   _id:mongoId(),
   tokenHash:tokenHash(code),
   userId:u.id,
   type:"email_verify_code",
   expiresAt,
   createdAt:now
  });
  await sendEmail(u.email,"Verify your Numelixa email",verificationEmail(code));
  return NextResponse.json({ok:true,expiresAt:expiresAt.toISOString(),reused:false});
 }catch(e){
  const m=e instanceof Error?e.message:"Verification failed";
  return NextResponse.json({ok:false,error:m},{status:m==="AUTH_REQUIRED"?401:500});
 }
}