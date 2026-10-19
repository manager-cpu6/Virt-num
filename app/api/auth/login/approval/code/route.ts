import crypto from "crypto";
import {NextResponse} from "next/server";
import {collection} from "@/lib/mongo";
import {tokenHash} from "@/lib/auth";
import {sendEmail,emailTemplate} from "@/lib/mailer";

export const runtime="nodejs";
export const dynamic="force-dynamic";
const TTL=10*60*1000;
const normalize=(value:string)=>String(value||"").trim();

export async function POST(req:Request){
 try{
  const body=await req.json().catch(()=>({}));
  const approvalId=normalize(body.approvalId);
  const action=normalize(body.action).toLowerCase();
  const code=normalize(body.code);
  if(!approvalId)return NextResponse.json({ok:false,error:"Login request is missing."},{status:400});
  const approvals=await collection<any>("loginApprovals");
  const row=await approvals.findOne({approvalId});
  if(!row||row.status!=="pending")return NextResponse.json({ok:false,error:"This login request is no longer pending."},{status:409});
  const now=new Date();
  if(new Date(row.expiresAt).getTime()<=now.getTime()){
   await approvals.updateOne({_id:row._id,status:"pending"},{$set:{status:"expired"}});
   return NextResponse.json({ok:false,error:"This login request expired. Please sign in again."},{status:410});
  }
  const users=await collection<any>("users");
  const user=await users.findOne({_id:String(row.userId)},{projection:{email:1,name:1}});
  const email=String(user?.email||"").trim().toLowerCase();
  if(!email.includes("@"))return NextResponse.json({ok:false,error:"The account email is unavailable. Contact support."},{status:400});
  if(action==="send"){
   const last=new Date(row.emailCodeSentAt||0).getTime();
   if(now.getTime()-last<60*1000)return NextResponse.json({ok:false,error:"Wait 60 seconds before requesting another email code."},{status:429});
   const plain=String(crypto.randomInt(100000,1000000));
   const expiresAt=new Date(now.getTime()+TTL);
   await approvals.updateOne({_id:row._id,status:"pending"},{$set:{emailCodeHash:tokenHash(plain),emailCodeExpiresAt:expiresAt,emailCodeSentAt:now,emailCodeAttempts:0}});
   const message="Hello "+String(user?.name||"there")+",\\n\\nYou requested an alternative way to approve a Numelixa sign-in because your registered device may be unavailable.\\n\\nYour one-time approval code is: "+plain+"\\n\\nThis code expires in 10 minutes and can be used only for this login request. If you did not try to sign in, do not share this code; return to Numelixa and deny the request or let it expire.\\n\\nLogin details: "+String(row.device||"Browser")+" · "+String(row.browser||"Browser")+" · "+[row.city,row.country].filter(Boolean).join(", ")+"\\n\\nNumelixa Account Security";
   await sendEmail(email,"Your Numelixa login approval code",emailTemplate("Alternative sign-in verification",message,"https://numelixa.com/login","Your one-time Numelixa login approval code."));
   return NextResponse.json({ok:true,message:"A one-time approval code was sent to your account email.",expiresInSeconds:600});
  }
  if(action==="verify"){
   if(!/^\d{6}$/.test(code))return NextResponse.json({ok:false,error:"Enter the 6-digit code from your email."},{status:400});
   const attempts=Number(row.emailCodeAttempts||0);
   if(attempts>=5)return NextResponse.json({ok:false,error:"Too many incorrect attempts. Start sign-in again."},{status:429});
   if(!row.emailCodeHash||!row.emailCodeExpiresAt||new Date(row.emailCodeExpiresAt).getTime()<=now.getTime()){
    return NextResponse.json({ok:false,error:"The email code expired. Request a new code."},{status:410});
   }
   if(tokenHash(code)!==String(row.emailCodeHash)){
    await approvals.updateOne({_id:row._id,status:"pending"},{$inc:{emailCodeAttempts:1}});
    return NextResponse.json({ok:false,error:"That code is incorrect. Check your email and try again."},{status:400});
   }
   const changed=await approvals.updateOne({_id:row._id,status:"pending"},{$set:{status:"approved",resolvedAt:now,approvedVia:"email_code"},$unset:{emailCodeHash:"",emailCodeExpiresAt:""}});
   if(!changed.modifiedCount)return NextResponse.json({ok:false,error:"This login request has already been resolved."},{status:409});
   return NextResponse.json({ok:true,message:"Login approved. Returning you to Numelixa…"});
  }
  return NextResponse.json({ok:false,error:"Unsupported action."},{status:400});
 }catch(error){
  console.error("[LOGIN APPROVAL EMAIL CODE]",error);
  return NextResponse.json({ok:false,error:"Unable to process the email verification request. Please try again."},{status:500});
 }
}