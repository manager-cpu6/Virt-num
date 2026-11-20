import {NextResponse} from "next/server";
import {requireUser} from "@/lib/auth";
import {collection} from "@/lib/mongo";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function POST(req:Request,{params}:{params:Promise<{slug:string}>}){
 try{
  const user=await requireUser(),{slug}=await params;
  const settings=await (await collection<any>("settings")).findOne({_id:"updates"});
  if(settings?.enabled!==true)return NextResponse.json({ok:false,error:"Updates is currently unavailable."},{status:404});
  const body=await req.json().catch(()=>null),postId=String(body?.postId||"").trim();
  if(!postId)return NextResponse.json({ok:false,error:"Post ID is required."},{status:400});
  const channel=await (await collection<any>("updateChannels")).findOne({slug,status:"active"},{projection:{_id:1}});
  if(!channel)return NextResponse.json({ok:false,error:"Channel not found."},{status:404});
  const post=await (await collection<any>("updatePosts")).findOne({_id:postId,channelId:String(channel._id),status:"published"});
  if(!post)return NextResponse.json({ok:false,error:"Post not found."},{status:404});
  const dayKey=new Date().toISOString().slice(0,10);
  try{await (await collection<any>("updatePostViews")).insertOne({postId,userId:String(user.id),dayKey,createdAt:new Date()});}catch(error){if((error as any)?.code!==11000)throw error;}
  const actual=await (await collection<any>("updatePostViews")).countDocuments({postId});
  const mode=post.viewDisplayMode==="custom"?"custom":"automatic",custom=Number(post.viewDisplayValue);
  return NextResponse.json({ok:true,actualViews:actual,displayViews:mode==="custom"&&Number.isSafeInteger(custom)&&custom>=0?custom:actual,displayViewsMode:mode});
 }catch(error){
  const message=error instanceof Error?error.message:"";
  return NextResponse.json({ok:false,error:message==="AUTH_REQUIRED"?"Please sign in again.":"Unable to record post view."},{status:message==="AUTH_REQUIRED"?401:500});
 }
}
