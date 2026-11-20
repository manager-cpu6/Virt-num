import {NextResponse} from "next/server";
import {requireUser} from "@/lib/auth";
import {collection} from "@/lib/mongo";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function POST(req:Request,{params}:{params:Promise<{slug:string}>}){
 try{
  const user=await requireUser(),{slug}=await params;
  const settings=await (await collection<any>("settings")).findOne({_id:"updates"});
  const account=await (await collection<any>("users")).findOne({_id:String(user.id)},{projection:{updatesPreferences:1}});
  if(account?.updatesPreferences?.hideUpdates===true)return NextResponse.json({ok:false,error:"Updates is hidden in your account settings."},{status:404});
  if(settings?.enabled!==true)return NextResponse.json({ok:false,error:"Updates is currently unavailable."},{status:404});
  const channel=await (await collection<any>("updateChannels")).findOne({slug,status:"active",visibility:{$ne:"private"}});
  if(!channel)return NextResponse.json({ok:false,error:"Channel not found."},{status:404});
  const channelId=String(channel._id),userId=String(user.id);
  const blocks=await collection<any>("updateBlocks");
  if(await blocks.findOne({channelId,userId}))return NextResponse.json({ok:false,error:"Unblock this channel before joining."},{status:403});
  const body=await req.json().catch(()=>({}));
  const subscriptions=await collection<any>("updateSubscriptions");
  const now=new Date();
  await subscriptions.updateOne({channelId,userId},{$setOnInsert:{channelId,userId,joinedAt:now},$set:{notificationsEnabled:body?.notificationsEnabled!==false,updatedAt:now}},{upsert:true});
  return NextResponse.json({ok:true,joined:true,notificationsEnabled:body?.notificationsEnabled!==false,subscriberCount:await subscriptions.countDocuments({channelId})});
 }catch(error){
  const message=error instanceof Error?error.message:"";
  return NextResponse.json({ok:false,error:message==="AUTH_REQUIRED"?"Please sign in again.":"Unable to join this channel."},{status:message==="AUTH_REQUIRED"?401:500});
 }
}
export async function DELETE(_req:Request,{params}:{params:Promise<{slug:string}>}){
 try{
  const user=await requireUser(),{slug}=await params;
  const channel=await (await collection<any>("updateChannels")).findOne({slug},{projection:{_id:1}});
  if(!channel)return NextResponse.json({ok:false,error:"Channel not found."},{status:404});
  const channelId=String(channel._id),userId=String(user.id);
  await (await collection<any>("updateSubscriptions")).deleteOne({channelId,userId});
  return NextResponse.json({ok:true,joined:false,subscriberCount:await (await collection<any>("updateSubscriptions")).countDocuments({channelId})});
 }catch(error){
  const message=error instanceof Error?error.message:"";
  return NextResponse.json({ok:false,error:message==="AUTH_REQUIRED"?"Please sign in again.":"Unable to leave this channel."},{status:message==="AUTH_REQUIRED"?401:500});
 }
}
