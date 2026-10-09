import {NextResponse} from "next/server";
import {requireAdmin} from "@/lib/auth";
import {collection} from "@/lib/mongo";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function GET(){
 try{await requireAdmin();const rows=await (await collection<any>("supportTickets")).find({}).sort({createdAt:-1}).limit(150).toArray();return NextResponse.json({ok:true,tickets:rows.map(x=>({id:String(x._id),userId:String(x.userId||""),userEmail:x.userEmail||"",userName:x.userName||"",channel:x.channel||"",contact:x.contact||"",subject:x.subject||"",message:x.message||"",status:x.status||"reviewing",createdAt:x.createdAt,reviewUntil:x.reviewUntil}))})}
 catch{return NextResponse.json({ok:false,error:"Admin access required."},{status:403})}
}
export async function PATCH(req:Request){
 try{await requireAdmin();const b=await req.json(),id=String(b.id||""),status=String(b.status||"");if(!id||!["reviewing","resolved","rejected"].includes(status))return NextResponse.json({ok:false,error:"Invalid ticket update."},{status:400});const r=await (await collection<any>("supportTickets")).updateOne({_id:id},{$set:{status,updatedAt:new Date()}});if(!r.matchedCount)return NextResponse.json({ok:false,error:"Support request not found."},{status:404});return NextResponse.json({ok:true})}
 catch{return NextResponse.json({ok:false,error:"Unable to update support request."},{status:500})}
}
