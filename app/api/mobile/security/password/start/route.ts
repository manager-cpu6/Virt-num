import {NextResponse} from "next/server";
import {requireUser,tokenHash,mongoId} from "@/lib/auth";
import {collection} from "@/lib/mongo";
import {sendEmail,verificationEmail} from "@/lib/mailer";

export const runtime="nodejs";
export const dynamic="force-dynamic";
const TTL=10*60*1000;

export async function POST(){
 try{
  const user=await requireUser();
  const email=String(user.email||"").trim().toLowerCase();
  if(!email.includes("@"))return NextResponse.json({ok:false,error:"A verified email account is required."},{status:400});
  const now=new Date();
  const users=await collection<any>("users");
  const fresh=await users.findOne({_id:String(user.id)},{projection:{passwordChangeLastAttemptAt:1,verifiedAt:1}});
  const last=new Date(fresh?.passwordChangeLastAttemptAt||0).getTime();
  if(now.getTime()-last<60*1000)return NextResponse.json({ok:false,error:"Wait 60 seconds before requesting another password code."},{status:429});
  const code=String(Math.floor(100000+Math.random()*900000));
  await users.updateOne({_id:String(user.id)},{$set:{passwordChangeLastAttemptAt:now}});
  await sendEmail(email,"Your Numelixa password change code",verificationEmail(code));
  const tokens=await collection<any>("emailTokens");
  await tokens.deleteMany({userId:String(user.id),type:"mobile_password_change_code"});
  await tokens.insertOne({_id:mongoId(),tokenHash:tokenHash(code),userId:String(user.id),type:"mobile_password_change_code",expiresAt:new Date(now.getTime()+TTL),createdAt:now});
  return NextResponse.json({ok:true,expiresInSeconds:600,message:"A password change code was sent to your email."});
 }catch(error){
  const message=error instanceof Error?error.message:"Unable to send password code.";
  return NextResponse.json({ok:false,error:message==="AUTH_REQUIRED"?"Please sign in again.":"Unable to send password code. Check email delivery and try again."},{status:message==="AUTH_REQUIRED"?401:500});
 }
}
