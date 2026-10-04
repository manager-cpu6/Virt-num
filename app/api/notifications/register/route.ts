import {NextResponse} from "next/server";
import {requireUser} from "@/lib/auth";
import {collection} from "@/lib/mongo";
export const runtime="nodejs";export const dynamic="force-dynamic";
export async function POST(req:Request){
 try{const user=await requireUser();const b=await req.json();const token=String(b.token||"").trim(),platform=String(b.platform||"unknown").trim().toLowerCase();if(!token||token.length<20)return NextResponse.json({ok:false,error:"Invalid device token."},{status:400});await (await collection<any>("deviceTokens")).updateOne({token},{$set:{token,userId:user.id,platform,updatedAt:new Date()},$setOnInsert:{createdAt:new Date()}},{upsert:true});return NextResponse.json({ok:true})}
 catch(e){return NextResponse.json({ok:false,error:e instanceof Error?e.message:"Unable to register device"},{status:401})}
}
