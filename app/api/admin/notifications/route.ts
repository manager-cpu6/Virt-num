import {NextResponse} from "next/server";
import {requireAdmin} from "@/lib/auth";
import {collection,mongoId} from "@/lib/mongo";
import {sendPush} from "@/lib/push";
export const runtime="nodejs";export const dynamic="force-dynamic";
export async function GET(){
 try{await requireAdmin();const rows=await (await collection<any>("notifications")).find({adminSent:true}).sort({createdAt:-1}).limit(50).toArray();return NextResponse.json({ok:true,notifications:rows.map(x=>({id:String(x._id),title:x.title,message:x.message,target:x.target,createdAt:x.createdAt,sentCount:x.sentCount||0}))})}
 catch(e){return NextResponse.json({ok:false,error:"Unauthorized"},{status:401})}
}
export async function POST(req:Request){
 try{
  await requireAdmin();const b=await req.json();const title=String(b.title||"").trim().slice(0,80),message=String(b.message||"").trim().slice(0,500),target=String(b.target||"all");
  if(!title||!message)return NextResponse.json({ok:false,error:"Title and message are required."},{status:400});
  const users=await collection<any>("users");const userIds=target==="all"?await users.find({}, {projection:{_id:1}}).toArray():target.startsWith("user:")?[{_id:target.slice(5)}]:[];
  if(!userIds.length)return NextResponse.json({ok:false,error:"No target users found."},{status:404});
  const notifications=userIds.map(u=>({_id:mongoId(),userId:String(u._id),title,message,adminSent:true,target,createdAt:new Date()}));
  await (await collection<any>("notifications")).insertMany(notifications);
  const ids=userIds.map(u=>String(u._id));const devices=await (await collection<any>("deviceTokens")).find({userId:{$in:ids}}).toArray();
  let sent=0,pushConfigured=false;try{const r=await sendPush(devices.map(x=>x.token),title,message);sent=r.successCount;pushConfigured=r.configured}catch{}
  await (await collection<any>("notifications")).updateMany({_id:{$in:notifications.map(x=>x._id)}},{$set:{sentCount:sent,pushConfigured,updatedAt:new Date()}});
  return NextResponse.json({ok:true,recipients:ids.length,devices:devices.length,sent,pushConfigured});
 }catch(e){return NextResponse.json({ok:false,error:e instanceof Error?e.message:"Notification send failed"},{status:500})}
}
