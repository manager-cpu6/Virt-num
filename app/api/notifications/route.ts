import {NextResponse} from "next/server";
import {requireUser} from "@/lib/auth";
import {collection} from "@/lib/mongo";
export const runtime="nodejs";export const dynamic="force-dynamic";
export async function GET(){
 try{const user=await requireUser();const rows=await (await collection<any>("notifications")).find({userId:user.id}).sort({createdAt:-1}).limit(50).toArray();const unread=rows.filter(x=>!x.readAt).length;return NextResponse.json({ok:true,unread,notifications:rows.map(x=>({id:String(x._id),title:x.title,message:x.message,createdAt:x.createdAt,readAt:x.readAt||null}))})}
 catch(e){return NextResponse.json({ok:false,error:"Unauthorized"},{status:401})}
}
export async function POST(req:Request){
 try{const user=await requireUser();const b=await req.json();const id=String(b.id||"");const c=await collection<any>("notifications");if(id)await c.updateOne({_id:id,userId:user.id},{$set:{readAt:new Date()}});else await c.updateMany({userId:user.id,readAt:{$exists:false}},{$set:{readAt:new Date()}});return NextResponse.json({ok:true})}
 catch(e){return NextResponse.json({ok:false,error:"Unable to update notifications"},{status:400})}
}
