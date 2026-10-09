import {NextResponse} from "next/server";
import {getUser} from "@/lib/auth";
import {collection,mongoId} from "@/lib/mongo";

export const runtime="nodejs";
export const dynamic="force-dynamic";
const DAY=24*60*60*1000;

export async function GET(){
  try{
    const user=await getUser();
    if(!user)return NextResponse.json({ok:false,error:"Please sign in to contact support."},{status:401});
    const tickets=await collection<any>("supportTickets");
    const latest=await tickets.find({userId:String(user.id)}).sort({createdAt:-1}).limit(1).next();
    const until=latest?new Date(latest.createdAt).getTime()+DAY:0;
    return NextResponse.json({ok:true,ticket:latest?{id:String(latest._id),subject:latest.subject,status:latest.status,createdAt:latest.createdAt,reviewUntil:new Date(until).toISOString(),canSubmit:Date.now()>=until}:null,canSubmit:!latest||Date.now()>=until});
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
    const latest=await tickets.find({userId:String(user.id)}).sort({createdAt:-1}).limit(1).next();
    if(latest){
      const nextAt=new Date(latest.createdAt).getTime()+DAY;
      if(Date.now()<nextAt)return NextResponse.json({ok:false,code:"REVIEW_COOLDOWN",error:"Your last support request is in the 24-hour review window.",reviewUntil:new Date(nextAt).toISOString()},{status:429});
    }
    const now=new Date(),id=mongoId();
    await tickets.insertOne({_id:id,userId:String(user.id),userEmail:String(user.email||""),userName:String(user.name||""),channel,contact,subject,message,status:"reviewing",createdAt:now,reviewUntil:new Date(now.getTime()+DAY),updatedAt:now});
    return NextResponse.json({ok:true,ticket:{id:String(id),status:"reviewing",createdAt:now,reviewUntil:new Date(now.getTime()+DAY)},message:"Your request has been submitted for review. You can submit another request after 24 hours."});
  }catch{return NextResponse.json({ok:false,error:"We could not submit your request. Please try again later."},{status:500})}
}
