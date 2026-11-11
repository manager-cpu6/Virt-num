import {NextResponse} from "next/server";
import {requireUser} from "@/lib/auth";
import {collection} from "@/lib/mongo";
export const runtime="nodejs";export const dynamic="force-dynamic";
export async function POST(req:Request){
 try{
  const user=await requireUser(),body=await req.json(),orderId=String(body.orderId||"").trim(),reference=String(body.transactionReference||"").trim().replace(/\s+/g,"").slice(0,80);
  if(!orderId||reference.length<5||!/^[A-Za-z0-9-]+$/.test(reference))return NextResponse.json({ok:false,error:"Enter a valid transaction reference."},{status:400});
  const payments=await collection<any>("payments"),order=await payments.findOne({orderId,provider:"ebirr_manual",userId:String(user.id)});
  if(!order)return NextResponse.json({ok:false,error:"Payment order not found."},{status:404});
  if(order.credited||["paid","rejected"].includes(order.status))return NextResponse.json({ok:false,error:"This payment is already closed."},{status:409});
  const duplicate=await payments.findOne({provider:"ebirr_manual",transactionReference:reference,orderId:{$ne:orderId}});
  if(duplicate)return NextResponse.json({ok:false,error:"This transaction reference has already been submitted."},{status:409});
  await payments.updateOne({_id:order._id,status:{$nin:["paid","rejected"]}},{$set:{transactionReference:reference,status:"pending_review",proofSubmittedAt:new Date(),updatedAt:new Date()}});
  return NextResponse.json({ok:true,status:"pending_review"});
 }catch(e){if(e instanceof Error&&e.message==="AUTH_REQUIRED")return NextResponse.json({ok:false,error:"Sign in to continue."},{status:401});return NextResponse.json({ok:false,error:"Unable to submit payment reference."},{status:500});}
}
