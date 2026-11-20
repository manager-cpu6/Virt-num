import {NextResponse} from "next/server";
import {requireUser} from "@/lib/auth";
import {collection} from "@/lib/mongo";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function GET(req:Request,{params}:{params:Promise<{slug:string}>}){
 try{
  const user=await requireUser();
  const {slug}=await params;
  const settings=await (await collection<any>("settings")).findOne({_id:"updates"});
  if(settings?.enabled!==true)return NextResponse.json({ok:false,error:"Updates is currently unavailable."},{status:404});
  const channel=await (await collection<any>("updateChannels")).findOne({slug,status:"active",visibility:{$ne:"private"}});
  if(!channel)return NextResponse.json({ok:false,error:"Channel not found."},{status:404});
  const channelId=String(channel._id);
  const blocked=await (await collection<any>("updateBlocks")).findOne({channelId,userId:String(user.id)});
  if(blocked)return NextResponse.json({ok:false,error:"This channel is blocked in your account."},{status:403});
  const page=Math.max(1,Math.min(1000,Number(new URL(req.url).searchParams.get("page")||1)));
  const limit=20;
  const posts=await (await collection<any>("updatePosts")).find({channelId,status:"published"}).sort({publishedAt:-1,_id:-1}).skip((page-1)*limit).limit(limit).toArray();
  const subscriptions=await collection<any>("updateSubscriptions");
  const [actual,member]=await Promise.all([subscriptions.countDocuments({channelId}),subscriptions.findOne({channelId,userId:String(user.id)})]);
  const mode=channel.subscriberDisplayMode==="custom"?"custom":"automatic";
  const custom=Number(channel.subscriberDisplayValue);
  const publicCount=mode==="custom"&&Number.isSafeInteger(custom)&&custom>=0?custom:actual;
  const postCollection=await collection<any>("updatePosts");
  const viewCollection=await collection<any>("updatePostViews");
  const result=[];
  for(const post of posts){
   const views=await viewCollection.countDocuments({postId:String(post._id)});
   result.push({id:String(post._id),title:String(post.title||""),body:String(post.body||""),type:String(post.type||"text"),media:Array.isArray(post.media)?post.media:[],links:Array.isArray(post.links)?post.links:[],publishedAt:post.publishedAt||post.createdAt||null,actualViews:views,displayViewsMode:post.viewDisplayMode==="custom"?"custom":"automatic",displayViews:post.viewDisplayMode==="custom"&&Number.isSafeInteger(Number(post.viewDisplayValue))?Number(post.viewDisplayValue):views});
  }
  return NextResponse.json({ok:true,channel:{id:channelId,slug:channel.slug,name:channel.name,description:channel.description||"",category:channel.category||"General",avatarUrl:channel.avatarUrl||"",coverUrl:channel.coverUrl||"",verified:channel.verified===true,actualSubscriberCount:actual,publicSubscriberCount:publicCount,subscriberDisplayMode:mode,joined:Boolean(member),notificationsEnabled:member?.notificationsEnabled!==false},posts:result,page,hasMore:posts.length===limit},{headers:{"Cache-Control":"no-store"}});
 }catch(error){
  const message=error instanceof Error?error.message:"";
  return NextResponse.json({ok:false,error:message==="AUTH_REQUIRED"?"Please sign in again.":"Unable to load this channel."},{status:message==="AUTH_REQUIRED"?401:500});
 }
}
