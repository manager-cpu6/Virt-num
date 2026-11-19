import {NextResponse} from "next/server";
import {requireAdmin} from "@/lib/auth";
import {sendEmailFrom} from "@/lib/mailer";
export const runtime="nodejs";
export const dynamic="force-dynamic";
const senders=["info","noreply","team"] as const;\nfunction safeHtml(input:string){return input.replace(/<script\\b[^>]*>[\\s\\S]*?<\\/script\\s*>/gi,"").replace(/\\son\\w+\\s*=\\s*(["\x27]).*?\\1/gi,"").replace(/(href|src)\\s*=\\s*(["\x27])\\s*javascript:[\\s\\S]*?\\2/gi,\x27$1="#"\x27);}\nexport async function POST(req:Request){
 try{
  const admin=await requireAdmin();
  const recipient=String(admin.email||"").trim();
  if(!recipient.includes("@"))return NextResponse.json({ok:false,error:"The signed-in administrator account has no valid email address."},{status:422});
  await sendEmailFrom(sender as any,recipient,"Numelixa email test",safeHtml(html));
  return NextResponse.json({ok:true,recipient,message:"Test email accepted by the mail server. Check the administrator inbox and spam folder."});
 }catch(error){
  const message=error instanceof Error?error.message:"Email test failed.";
  console.error("[ADMIN EMAIL TEST]",message);
  const status=message==="AUTH_REQUIRED"||message==="ADMIN_REQUIRED"?401:502;
  return NextResponse.json({ok:false,error:status===401?"Unauthorized":message},{status});
 }
}
