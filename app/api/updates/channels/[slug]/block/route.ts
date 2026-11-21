import {NextResponse} from "next/server";
import {requireUser} from "@/lib/auth";
import {collection} from "@/lib/mongo";
export const runtime="nodejs";export const dynamic="force-dynamic";
export async function POST(_req:Request,{params}:{params:Promise<{slug:string}>}){try{const user=await requireUser(),{slug}=await params,channel=await (await collection<any>("updatesChannels")).findOne({slug});if(!channel)return NextResponse.json({ok:false,error:"Channel not found."},{status:404});const channelId=String(channel._id);await (await collection<any>("updatesBlocks")).updateOne({channelId,userId:user.id},{$set:{blockedAt:new Date()},$setOnInsert:{createdAt:new Date()}},{upsert:true});await (await collection<any>("updatesMemberships")).updateOne({channelId,userId:user.id},{$set:{active:false,updatedAt:new Date()}});return NextResponse.json({ok:true})}catch{return NextResponse.json({ok:false,error:"Unable to block channel."},{status:401})}}
