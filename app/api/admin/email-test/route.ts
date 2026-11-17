import {NextResponse} from "next/server";
import {requireAdmin} from "@/lib/auth";
import {sendEmail,emailTemplate} from "@/lib/mailer";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function POST(){
 try{
  const admin=await requireAdmin();
  const recipient=String(admin.email||"").trim();
  if(!recipient.includes("@"))return NextResponse.json({ok:false,error:"The signed-in administrator account has no valid email address."},{status:422});
  await sendEmail(recipient,"Numelixa email delivery test",emailTemplate("Email delivery test","This is a test message from your Numelixa admin panel. If you received it, outbound email delivery is working.","https://numelixa.com/admin","Numelixa email diagnostics"));
  return NextResponse.json({ok:true,recipient,message:"Test email accepted by the mail server. Check the administrator inbox and spam folder."});
 }catch(error){
  const message=error instanceof Error?error.message:"Email test failed.";
  console.error("[ADMIN EMAIL TEST]",message);
  const status=message==="AUTH_REQUIRED"||message==="ADMIN_REQUIRED"?401:502;
  return NextResponse.json({ok:false,error:status===401?"Unauthorized":message},{status});
 }
}
