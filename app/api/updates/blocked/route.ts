import {NextResponse} from "next/server";
import {requireUser} from "@/lib/auth";
import {collection} from "@/lib/mongo";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function GET(){
 try{
  const user=await requireUser();
  const settings=await (await collection<any>("settings")).findOne({_id:"updates"});
  if(settings?.enabled!==true)return NextResponse.json({ok:true,channels:[]},{headers:{"Cache-Control":"no-store"}});
  const rows=await (await collection<any>("updateBlocks")).find({userId:String(user.id)}).sort({createdAt:-1}).toArray();
  const ids=rows.map(x=>String(x.channelId));
  const channels=ids.length?await (await collection<any>("updateChannels")).find({_id:{$in:ids}},{projection:{_id:1,slug:1,name:1,description:1,avatarUrl:1,verified:1}}).toArray():[];
  return NextResponse.json({ok:true,channels:channels.map(c=>({_id:String(c._id),slug:c.slug,name:c.name,description:c.description||"",avatarUrl:c.avatarUrl||"",verified:c.verified===true}))},{headers:{"Cache-Control":"no-store"}});
 }catch(error){
  const message=error instanceof Error?error.message:"";
  return NextResponse.json({ok:false,error:message==="AUTH_REQUIRED"?"Please sign in again.":"Unable to load blocked channels."},{status:message==="AUTH_REQUIRED"?401:500});
 }
}
export async function DELETE(req:Request){
 try{
  const user=await requireUser(),body=await req.json().catch(()=>null);
  const settings=await (await collection<any>("settings")).findOne({_id:"updates"});
  if(settings?.enabled!==true)return NextResponse.json({ok:false,error:"Updates is currently unavailable."},{status:404});
  const channelId=String(body?.channelId||"").trim(),slug=String(body?.slug||"").trim();
  if(!channelId&&!slug)return NextResponse.json({ok:false,error:"Channel ID or slug is required."},{status:400});
  const channel=await (await collection<any>("updateChannels")).findOne(channelId?{_id:channelId}:{slug},{projection:{_id:1}});
  if(!channel)return NextResponse.json({ok:false,error:"Channel not found."},{status:404});
  await (await collection<any>("updateBlocks")).deleteOne({channelId:String(channel._id),userId:String(user.id)});
  return NextResponse.json({ok:true,blocked:false});
 }catch(error){
  const message=error instanceof Error?error.message:"";
  return NextResponse.json({ok:false,error:message==="AUTH_REQUIRED"?"Please sign in again.":"Unable to unblock channel."},{status:message==="AUTH_REQUIRED"?401:500});
 }
}
