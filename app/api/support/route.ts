import {NextResponse} from "next/server";
import {getUser} from "@/lib/auth";
import {collection,mongoId} from "@/lib/mongo";
import {sendEmail,emailTemplate} from "@/lib/mailer";

export const runtime="nodejs";
export const dynamic="force-dynamic";

export async function GET(){
  try{
    const user=await getUser();
    if(!user)return NextResponse.json({ok:false,error:"Please sign in to contact support."},{status:401});
    const tickets=await collection<any>("supportTickets");
    const latest=await tickets.find({userId:String(user.id)}).sort({createdAt:-1}).limit(1).next();
    return NextResponse.json({ok:true,ticket:latest?{id:String(latest._id),subject:latest.subject,status:latest.status,createdAt:latest.createdAt}:null,canSubmit:true});
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
    await tickets.insertOne({_id:id,userId:String(user.id),userEmail:String(user.email||""),userName:String(user.name||""),channel,contact,subject,message,status:"reviewing",createdAt:now,updatedAt:now});
    const acknowledgement="Hello "+String(user.name||"there")+",\\n\\nThank you for contacting Numelixa Support. We have received your message and created a support ticket for you.\\n\\nTICKET DETAILS\\nTicket ID: "+String(id)+"\\nSubject: "+subject+"\\nStatus: Received — awaiting review\\nSubmitted: "+now.toLocaleString("en-US",{dateStyle:"long",timeStyle:"short",timeZone:"UTC"})+" UTC\\n\\nWHAT HAPPENS NEXT?\\nOur support team will review the details you provided, check any relevant account or order information, and reply to this email if more information is needed. Please keep your ticket ID in the subject of any follow-up so we can find your request quickly. You do not need to submit the same request again. We will respond as soon as a team member has reviewed it; you do not need to wait a fixed 24-hour window before contacting support again.\\n\\nFor your security, never send your password or one-time verification codes in a support message.\\n\\nKind regards,\\nNumelixa Support Team";
    try{if(user.email)await sendEmail(String(user.email),"Ticket #"+String(id)+" received — Numelixa Support",emailTemplate("Your support ticket is open",acknowledgement,"https://support.numelixa.com","Ticket #"+String(id)+" has been received by Numelixa Support."));}catch(error){console.error("[SUPPORT ACK EMAIL]",error)}
    return NextResponse.json({ok:true,ticket:{id:String(id),status:"reviewing",createdAt:now},message:"Your request has been received. We can see your request and will respond after our team has reviewed it. Your ticket number is "+String(id)+"."});
  }catch{return NextResponse.json({ok:false,error:"We could not submit your request. Please try again later."},{status:500})}
}
