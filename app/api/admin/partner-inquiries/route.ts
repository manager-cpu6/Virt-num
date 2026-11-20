import {NextResponse} from "next/server";
import {requireAdmin} from "@/lib/auth";
import {collection} from "@/lib/mongo";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function GET(){
 try{await requireAdmin();const rows=await (await collection<any>("partnerInquiries")).find({}).sort({createdAt:-1}).limit(100).toArray();return NextResponse.json({ok:true,inquiries:rows.map(x=>({id:String(x._id),name:x.name,email:x.email,company:x.company||"",category:x.category,message:x.message,status:x.status||"received",createdAt:x.createdAt||null}))},{headers:{"Cache-Control":"no-store"}});}
 catch(error){const m=error instanceof Error?error.message:"";const status=m==="AUTH_REQUIRED"||m==="ADMIN_REQUIRED"?401:500;return NextResponse.json({ok:false,error:status===401?"Unauthorized":"Unable to load partnership enquiries."},{status});}
}
export async function PATCH(req:Request){
 try{await requireAdmin();const body=await req.json().catch(()=>null);const id=String(body?.id||"").trim(),status=String(body?.status||"").trim();if(!id||!["received","reviewing","responded","closed"].includes(status))return NextResponse.json({ok:false,error:"A valid enquiry ID and status are required."},{status:400});const result=await (await collection<any>("partnerInquiries")).updateOne({_id:id},{$set:{status,updatedAt:new Date()}});if(!result.matchedCount)return NextResponse.json({ok:false,error:"Enquiry not found."},{status:404});return NextResponse.json({ok:true,status});}
 catch(error){const m=error instanceof Error?error.message:"";const status=m==="AUTH_REQUIRED"||m==="ADMIN_REQUIRED"?401:500;return NextResponse.json({ok:false,error:status===401?"Unauthorized":"Unable to update enquiry."},{status});}
}
