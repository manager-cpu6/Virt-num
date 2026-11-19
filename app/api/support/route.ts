import {NextResponse} from "next/server";
import {getUser} from "@/lib/auth";
import {collection,mongoId} from "@/lib/mongo";
import {sendEmailFrom,emailTemplate} from "@/lib/mailer";

export const runtime="nodejs";
export const dynamic="force-dynamic";

export async function GET(){
  try{
    const user=await getUser();
    if(!user)return NextResponse.json({ok:false,error:"Please sign in to contact support."},{status:401});
    const tickets=await collection<any>("supportTickets");
    const latest=await tickets.find({userId:String(user.id),status:{$nin:["resolved","rejected"]}}).sort({createdAt:-1}).limit(1).next();
    return NextResponse.json({ok:true,ticket:latest?{id:String(latest._id),subject:latest.subject,status:latest.status,createdAt:latest.createdAt,updatedAt:latest.updatedAt}:null,canSubmit:true},{headers:{"Cache-Control":"no-store"}});
  }catch{return NextResponse.json({ok:false,error:"Support is temporarily unavailable."},{status:500})}
}

export async function POST(req:Request){
  try{
    const user=await getUser();
    if(!user)return NextResponse.json({ok:false,error:"Please sign in to contact support."},{status:401});
    const body=await req.json();
    const channel=String(body.channel||"").trim().toLowerCase();
    const contact=String(body.contact||"").trim();
    const subject=String(body.subject||"").trim();
    const message=String(body.message||"").trim();
    if(!["email","whatsapp","telegram"].includes(channel))return NextResponse.json({ok:false,error:"Choose email, WhatsApp, or Telegram."},{status:400});
    if(!contact||contact.length>160)return NextResponse.json({ok:false,error:"Enter your contact detail."},{status:400});
    if(channel==="telegram"&&!/^@?[a-zA-Z0-9_]{5,32}$/.test(contact))return NextResponse.json({ok:false,error:"Enter a valid Telegram username, for example @yourname."},{status:400});
    if(channel==="whatsapp"&&contact.replace(/[+\s().-]/g,"").length<7)return NextResponse.json({ok:false,error:"Enter a valid WhatsApp phone number with country code."},{status:400});
    if(channel==="email"&&!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(contact))return NextResponse.json({ok:false,error:"Enter a valid email address."},{status:400});
    if(subject.length<4||subject.length>120||message.length<15||message.length>3000)return NextResponse.json({ok:false,error:"Add a subject and a message (15–3000 characters)."}, {status:400});
    const tickets=await collection<any>("supportTickets");
    const now=new Date(),id=mongoId();
    await tickets.insertOne({_id:id,userId:String(user.id),userEmail:String(user.email||""),replyEmail:channel==="email"?contact:String(user.email||""),userName:String(user.name||""),channel,contact,subject,message,status:"new",createdAt:now,updatedAt:now});
    const acknowledgementEmail=channel==="email"?contact:String(user.email||"");
    if(acknowledgementEmail){
      const safe=(value:string)=>value.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/\x27/g,"&#39;");
      const text="Hello "+safe(String(user.name||"there"))+",<br><br>Thank you for contacting Numelixa Support. Your request has been received and is now waiting for review.<br><br>Ticket ID: "+safe(String(id))+"<br>Subject: "+safe(subject)+"<br>Status: Received — awaiting review<br><br>Our team will review your request and email you when it is solved. You can return to https://support.numelixa.com to see the current status.<br><br>For your security, never send your password or one-time verification codes.<br><br>Numelixa Support Team";
      try{await sendEmailFrom("team",acknowledgementEmail,"Ticket #"+String(id)+" received — Numelixa Support",emailTemplate("Your support request was received",text,"https://support.numelixa.com","Your Numelixa support request was received."));}
      catch(error){console.error("[SUPPORT ACK EMAIL]",error)}
    }
    return NextResponse.json({ok:true,ticket:{id:String(id),status:"new",createdAt:now},message:"Your request has been received and is awaiting review. Ticket number: "+String(id)+"."});
  }catch{return NextResponse.json({ok:false,error:"We could not submit your request. Please try again later."},{status:500})}
}
