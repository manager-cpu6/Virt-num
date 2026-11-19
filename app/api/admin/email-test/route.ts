import {NextResponse} from "next/server";
import {requireAdmin} from "@/lib/auth";
import {sendEmailFrom} from "@/lib/mailer";

export const runtime="nodejs";
export const dynamic="force-dynamic";

const senders=["info","noreply","team"] as const;
type Sender=typeof senders[number];

function safeHtml(input:string){
 return input
  .replace(/<script\\b[^>]*>[\\s\\S]*?<\\/script\\s*>/gi,"")
  .replace(/\\son\\w+\\s*=\\s*(["']).*?\\1/gi,"")
  .replace(/(href|src)\\s*=\\s*(["'])\\s*javascript:[\\s\\S]*?\\2/gi,'$1="#"');
}

export async function POST(req:Request){
 try{
  const admin=await requireAdmin();
  const body=await req.json().catch(()=>({}));
  const sender=String(body.sender||"info") as Sender;
  const html=String(body.html||"");
  if(!senders.includes(sender))return NextResponse.json({ok:false,error:"Choose a valid Numelixa sender address."},{status:400});
  if(html.trim().length<20||html.length>120000)return NextResponse.json({ok:false,error:"Enter HTML email content (20–120,000 characters)."},{status:400});
  const recipient=String(admin.email||"").trim();
  if(!/^[^\\s@]+@[^\\s@]+\\.[^\\s@]+$/.test(recipient))return NextResponse.json({ok:false,error:"The signed-in administrator account has no valid email address."},{status:422});
  await sendEmailFrom(sender,recipient,"Numelixa email test",safeHtml(html));
  return NextResponse.json({ok:true,recipient,message:"Test email accepted by the mail server. Check the administrator inbox and spam folder."});
 }catch(error){
  const message=error instanceof Error?error.message:"Email test failed.";
  console.error("[ADMIN EMAIL TEST]",message);
  const limited=message.startsWith("EMAIL_RATE_LIMITED:");
  const status=message==="AUTH_REQUIRED"||message==="ADMIN_REQUIRED"?401:limited?429:502;
  const safeMessage=limited?"Your mail provider has temporarily paused outgoing email. The test was not sent; wait before trying again.":status===401?"Unauthorized":message;
  return NextResponse.json({ok:false,error:safeMessage},{status,headers:limited?{"Retry-After":"300"}:undefined});
 }
}
