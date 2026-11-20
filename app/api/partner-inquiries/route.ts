import {NextResponse} from "next/server";
import {createHash} from "node:crypto";
import {collection,mongoId} from "@/lib/mongo";
import {sendEmailFrom,emailTemplate} from "@/lib/mailer";
export const runtime="nodejs";
export const dynamic="force-dynamic";
const clean=(value:unknown,max:number)=>String(value??"").trim().slice(0,max);
const escapeHtml=(value:string)=>value.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");
export async function POST(req:Request){
 try{
  const body=await req.json().catch(()=>null);
  if(!body)return NextResponse.json({ok:false,error:"Invalid request."},{status:400});
  if(clean(body.website,180))return NextResponse.json({ok:true,message:"Your enquiry has been received."},{status:202});
  const name=clean(body.name,100),email=clean(body.email,160).toLowerCase(),company=clean(body.company,120),category=clean(body.category,50),message=clean(body.message,4000);
  if(name.length<2||!/^\S+@\S+\.\S+$/.test(email)||message.length<20||!["business","technical","api","reseller","enterprise","other"].includes(category))
   return NextResponse.json({ok:false,error:"Please provide your name, valid email, enquiry category and a message of at least 20 characters."},{status:400});
  const ip=(req.headers.get("x-forwarded-for")||"unknown").split(",")[0].trim();
  const ipHash=createHash("sha256").update(ip+"|"+String(process.env.RATE_LIMIT_SECRET||"numelixa-partner-inquiry")).digest("hex");
  const now=new Date(),limits=await collection<any>("partnerInquiryRateLimits");
  const previous=await limits.findOne({_id:ipHash});
  if(previous&&new Date(previous.resetAt).getTime()>now.getTime()&&Number(previous.count||0)>=5)
   return NextResponse.json({ok:false,error:"Too many partnership enquiries from this connection. Please try again later."},{status:429});
  await limits.updateOne({_id:ipHash},{$set:{resetAt:new Date(now.getTime()+60*60*1000),updatedAt:now},$inc:{count:previous&&new Date(previous.resetAt).getTime()>now.getTime()?1:-Number(previous?.count||0)+1}},{upsert:true});
  const id=mongoId();
  await (await collection<any>("partnerInquiries")).insertOne({_id:id,name,email,company,category,message,status:"received",createdAt:now,updatedAt:now});
  const subject="New Numelixa "+category+" partnership enquiry";
  const html="<h2>New partnership enquiry</h2><p><b>Reference:</b> "+escapeHtml(String(id))+"</p><p><b>Name:</b> "+escapeHtml(name)+"</p><p><b>Email:</b> "+escapeHtml(email)+"</p><p><b>Company:</b> "+escapeHtml(company||"Not provided")+"</p><p><b>Category:</b> "+escapeHtml(category)+"</p><p><b>Message:</b><br>"+escapeHtml(message).replace(/\n/g,"<br>")+"</p>";
  let emailSent=false;
  try{await sendEmailFrom("team","support@numelixa.com",subject,emailTemplate(subject,html,"https://www.numelixa.com/partners","A new partnership enquiry has been submitted."));emailSent=true;}
  catch(error){console.error("[PARTNER_INQUIRY_EMAIL]",{inquiryId:String(id),message:error instanceof Error?error.message:"Email delivery failed"});}
  return NextResponse.json({ok:true,reference:String(id),emailNotificationSent:emailSent,message:"Your partnership enquiry has been recorded. The Numelixa team will review it."},{status:201});
 }catch(error){
  console.error("[PARTNER_INQUIRY]",error instanceof Error?error.message:"Unknown failure");
  return NextResponse.json({ok:false,error:"We could not submit your enquiry right now. Please try again later."},{status:500});
 }
}
