import {NextResponse} from "next/server";
import {requireUser} from "@/lib/auth";
import {collection} from "@/lib/mongo";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function POST(_req:Request,{params}:{params:Promise<{slug:string}>}){
 try{
  const user=await requireUser(),{slug}=await params;
  const channel=await (await collection<any>("updateChannels")).findOne({slug},{projection:{_id:1}});
  if(!channel)return NextResponse.json({ok:false,error:"Channel not found."},{status:404});
  const channelId=String(channel._id),userId=String(user.id),now=new Date();
  await (await collection<any>("updateBlocks")).updateOne({channelId,userId},{$setOnInsert:{channelId,userId,createdAt:now}},{upsert:true});
  await (await collection<any>("updateSubscriptions")).deleteOne({channelId,userId});
  return NextResponse.json({ok:true,blocked:true});
 }catch(error){
  const message=error instanceof Error?error.message:"";
  return NextResponse.json({ok:false,error:message==="AUTH_REQUIRED"?"Please sign in again.":"Unable to block this channel."},{status:message==="AUTH_REQUIRED"?401:500});
 }
}
export async function DELETE(_req:Request,{params}:{params:Promise<{slug:string}>}){
 try{
  const user=await requireUser(),{slug}=await params;
  const channel=await (await collection<any>("updateChannels")).findOne({slug},{projection:{_id:1}});
  if(!channel)return NextResponse.json({ok:false,error:"Channel not found."},{status:404});
  await (await collection<any>("updateBlocks")).deleteOne({channelId:String(channel._id),userId:String(user.id)});
  return NextResponse.json({ok:true,blocked:false});
 }catch(error){
  const message=error instanceof Error?error.message:"";
  return NextResponse.json({ok:false,error:message==="AUTH_REQUIRED"?"Please sign in again.":"Unable to unblock this channel."},{status:message==="AUTH_REQUIRED"?401:500});
 }
}
