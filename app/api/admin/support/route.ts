import {NextResponse} from "next/server";
import {requireAdmin} from "@/lib/auth";
import {collection} from "@/lib/mongo";
import {sendEmail,emailTemplate} from "@/lib/mailer";
export const runtime="nodejs";
export const dynamic="force-dynamic";

export async function GET(){
 try{
  await requireAdmin();
  const rows=await (await collection<any>("supportTickets")).find({status:{$nin:["resolved","rejected"]}}).sort({createdAt:-1}).limit(150).toArray();
  return NextResponse.json({ok:true,tickets:rows.map(x=>({id:String(x._id),userId:String(x.userId||""),userEmail:x.userEmail||"",userName:x.userName||"",channel:x.channel||"",contact:x.contact||"",subject:x.subject||"",message:x.message||"",status:x.status||"reviewing",createdAt:x.createdAt,updatedAt:x.updatedAt}))},{headers:{"Cache-Control":"no-store"}});
 }catch{return NextResponse.json({ok:false,error:"Admin access required."},{status:403})}
}

export async function PATCH(req:Request){
 try{
  await requireAdmin();
  const b=await req.json(),id=String(b.id||""),status=String(b.status||"");
  if(!id||!["reviewing","resolved","rejected"].includes(status))return NextResponse.json({ok:false,error:"Invalid ticket update."},{status:400});
  const tickets=await collection<any>("supportTickets");
  const ticket=await tickets.findOne({_id:id});
  if(!ticket)return NextResponse.json({ok:false,error:"Support request not found."},{status:404});
  if(ticket.status==="resolved")return NextResponse.json({ok:true,emailSent:true,alreadyResolved:true});
  if(status==="resolved"){
    const recipient=String(ticket.replyEmail||ticket.userEmail||"").trim();
    if(!recipient)return NextResponse.json({ok:false,error:"No user email is available for the solved notification. The ticket was not closed."},{status:422});
    const name=String(ticket.userName||"there"),subject=String(ticket.subject||"Support request");
    const body="Hello "+name+",\n\nYour Numelixa Support request has been marked as solved by our support team.\n\nTicket ID: "+id+"\nSubject: "+subject+"\nStatus: Solved\n\nIf you still need help, you can submit a new request at https://support.numelixa.com.\n\nThank you for using Numelixa.\n\nNumelixa Support Team";
    try{await sendEmail(recipient,"Your Numelixa support request has been solved — #"+id,emailTemplate("Your request has been solved",body,"https://support.numelixa.com","Your Numelixa support ticket has been marked as solved."));}
    catch(error){console.error("[SUPPORT SOLVED EMAIL]",error);return NextResponse.json({ok:false,error:"The solved email could not be sent, so the ticket remains open. Check the mail server and try again."},{status:502})}
  }
  const r=await tickets.updateOne({_id:id,status:{$ne:"resolved"}},{$set:{status,updatedAt:new Date(),...(status==="resolved"?{solvedEmailSentAt:new Date() }:{})}});
  if(!r.matchedCount)return NextResponse.json({ok:false,error:"The request changed before this update. Refresh the inbox."},{status:409});
  return NextResponse.json({ok:true,emailSent:status==="resolved"});
 }catch{return NextResponse.json({ok:false,error:"Unable to update support request."},{status:500})}
}
