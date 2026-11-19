import {NextResponse} from "next/server";
import {requireAdmin} from "@/lib/auth";
import {collection,mongoId} from "@/lib/mongo";
import {sendEmailFrom} from "@/lib/mailer";
export const runtime="nodejs";
export const dynamic="force-dynamic";
const allowedSenders=["info","payment","welcome","noreply","team","system","notification"] as const;
type Sender=typeof allowedSenders[number];
const BATCH_SIZE=5;
function safeHtml(input:string){return input.replace(/<script\b[^>]*>[\s\S]*?<\/script\s*>/gi,"").replace(/\son\w+\s*=\s*(["']).*?\1/gi,"").replace(/(href|src)\s*=\s*(["'])\s*javascript:[\s\S]*?\2/gi,'$1="#"');}
async function counts(campaignId:string){const rows=await collection<any>("adminEmailRecipients");const [sent,failed,pending,sending]=await Promise.all([rows.countDocuments({campaignId,status:"sent"}),rows.countDocuments({campaignId,status:"failed"}),rows.countDocuments({campaignId,status:"pending"}),rows.countDocuments({campaignId,status:"sending"})]);return{sent,failed,pending,sending,remaining:pending+sending};}
export async function POST(req:Request){
 try{
  const admin=await requireAdmin();
  const body=await req.json().catch(()=>({}));
  const action=String(body.action||"");
  const campaigns=await collection<any>("adminEmailCampaigns");
  const recipients=await collection<any>("adminEmailRecipients");
  if(action==="create"){
   const sender=String(body.sender||"") as Sender;
   const subject="A message from Numelixa";
   const html=String(body.html||"");
   if(!allowedSenders.includes(sender))return NextResponse.json({ok:false,error:"Choose a valid Numelixa sender address."},{status:400});
   if(html.trim().length<20||html.length>120000)return NextResponse.json({ok:false,error:"HTML email content must be 20–120,000 characters."},{status:400});
   const users=await (await collection<any>("users")).find({email:{$type:"string",$ne:""}}).project({email:1,name:1}).toArray();
   const unique=new Map<string,{email:string;name:string}>();
   for(const user of users){const email=String(user.email||"").trim().toLowerCase();if(/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)&&!unique.has(email))unique.set(email,{email,name:String(user.name||"")});}
   if(!unique.size)return NextResponse.json({ok:false,error:"No registered users with valid email addresses were found."},{status:404});
   const campaignId=mongoId(),now=new Date();
   await campaigns.insertOne({_id:campaignId,sender,subject,html:safeHtml(html),total:unique.size,createdBy:String(admin.id||admin.email||""),createdAt:now,status:"sending"});
   const docs=[...unique.values()].map(user=>({_id:mongoId(),campaignId,email:user.email,name:user.name,status:"pending",createdAt:now,updatedAt:now}));
   for(let i=0;i<docs.length;i+=500)await recipients.insertMany(docs.slice(i,i+500),{ordered:false});
   return NextResponse.json({ok:true,campaignId,total:docs.length,message:"Campaign created. Sending begins in small batches."});
  }
  if(action==="send"||action==="retry"){
   const campaignId=String(body.campaignId||"");
   if(!campaignId)return NextResponse.json({ok:false,error:"Campaign ID is required."},{status:400});
   const campaign=await campaigns.findOne({_id:campaignId});
   if(!campaign)return NextResponse.json({ok:false,error:"Email campaign not found."},{status:404});
   if(action==="retry")await recipients.updateMany({campaignId,status:"failed"},{$set:{status:"pending",updatedAt:new Date(),lastError:null}});
   const batch=await recipients.find({campaignId,status:"pending"}).sort({createdAt:1,_id:1}).limit(BATCH_SIZE).toArray();
   for(const item of batch){
    const claimed=await recipients.updateOne({_id:item._id,status:"pending"},{$set:{status:"sending",updatedAt:new Date()}});
    if(!claimed.modifiedCount)continue;
    try{
     const greeting=item.name?"Hello "+String(item.name).replace(/[<>]/g,"")+",":"Hello,";
     const html='<div style="font-family:Arial,sans-serif;max-width:640px;margin:0 auto;color:#17233b;line-height:1.65"><div style="padding:18px 0;border-bottom:1px solid #e7edf5"><strong style="letter-spacing:2px;color:#1769e8">NUMELIXA</strong></div><p>'+greeting+'</p>'+String(campaign.html||"")+'<hr style="border:0;border-top:1px solid #e7edf5;margin:28px 0"><p style="font-size:12px;color:#718096">You are receiving this message because you have a registered Numelixa account.</p></div>';
     await sendEmailFrom(campaign.sender as Sender,item.email,campaign.subject,html);
     await recipients.updateOne({_id:item._id},{$set:{status:"sent",sentAt:new Date(),updatedAt:new Date()},$unset:{lastError:""}});
    }catch(error){
     const message=error instanceof Error?error.message:"Email delivery failed.";
     await recipients.updateOne({_id:item._id},{$set:{status:"failed",lastError:message.slice(0,500),updatedAt:new Date()}});
    }
   }
   const progress=await counts(campaignId);
   await campaigns.updateOne({_id:campaignId},{$set:{...progress,status:progress.remaining===0?(progress.failed?"completed_with_errors":"completed"):"sending",updatedAt:new Date()}});
   return NextResponse.json({ok:true,campaignId,total:Number(campaign.total||0),...progress,complete:progress.remaining===0});
  }
  return NextResponse.json({ok:false,error:"Unsupported email campaign action."},{status:400});
 }catch(error){
  const message=error instanceof Error?error.message:"Unable to process the email campaign.";
  const status=message==="AUTH_REQUIRED"||message==="ADMIN_REQUIRED"?401:500;
  return NextResponse.json({ok:false,error:status===401?"Admin access required.":message},{status});
 }
}
