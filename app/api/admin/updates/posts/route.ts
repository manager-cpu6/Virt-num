import {NextResponse} from "next/server";
import {requireAdmin} from "@/lib/auth";
import {collection,mongoId} from "@/lib/mongo";
import {sendPush} from "@/lib/push";
export const runtime="nodejs";
export const dynamic="force-dynamic";
const clean=(v:unknown,max:number)=>String(v??"").trim().slice(0,max);
const allowedTypes=new Set(["text","image","gallery","video","announcement","update","service","maintenance","new-number","link","rich"]);
function safeHttps(v:unknown){const value=clean(v,1800);if(!value)return "";try{const u=new URL(value);return u.protocol==="https:"?u.toString():""}catch{return ""}}
function normalizedMedia(raw:unknown){if(!Array.isArray(raw))return [];return raw.slice(0,10).map((x:any)=>({url:safeHttps(x?.url||x),type:x?.type==="video"?"video":"image",alt:clean(x?.alt,140)})).filter(x=>x.url);}
function display(b:any){const mode=b.viewDisplayMode==="custom"?"custom":"automatic",value=Number(b.viewDisplayValue??0);if(mode==="custom"&&(!Number.isSafeInteger(value)||value<0||value>10000000000))throw new Error("Displayed views must be a whole number from 0 to 10,000,000,000.");return {viewDisplayMode:mode,viewDisplayValue:mode==="custom"?value:null};}
async function notifySubscribers(channel:any,post:any){
 const settings=await (await collection<any>("settings")).findOne({_id:"updates"});
 if(settings?.enabled!==true||settings?.notificationsEnabled===false)return {sent:0,failed:0};
 const memberships=await (await collection<any>("updateSubscriptions")).find({channelId:String(channel._id),notificationsEnabled:{$ne:false}},{projection:{userId:1}}).toArray();
 const userIds=[...new Set(memberships.map(x=>String(x.userId)).filter(Boolean))];
 if(!userIds.length)return {sent:0,failed:0};
 const blocks=await (await collection<any>("updateBlocks")).find({channelId:String(channel._id),userId:{$in:userIds}},{projection:{userId:1}}).toArray();
 const blocked=new Set(blocks.map(x=>String(x.userId)));
 const allowed=userIds.filter(x=>!blocked.has(x));
 const devices=await (await collection<any>("deviceTokens")).find({userId:{$in:allowed},platform:"android",enabled:{$ne:false}},{projection:{token:1}}).toArray();
 const tokens=[...new Set(devices.map(x=>String(x.token||"")).filter(x=>x.length>=20))];
 if(!tokens.length)return {sent:0,failed:0};
 const preview=String(post.body||post.title||"New channel post").replace(/\s+/g," ").slice(0,150);
 const result=await sendPush(tokens,String(post.title||channel.name||"Numelixa Updates").slice(0,80),preview,{type:"updates_post",iconType:"announcement",channelId:String(channel._id),channelSlug:String(channel.slug),postId:String(post._id),url:"updates:"+String(channel.slug)+":"+String(post._id)});
 return {sent:result.successCount,failed:result.failureCount};
}
export async function GET(req:Request){
 try{
  await requireAdmin();
  const url=new URL(req.url),channelId=clean(url.searchParams.get("channelId"),120);
  const filter:Record<string,unknown>={};if(channelId)filter.channelId=channelId;
  const posts=await (await collection<any>("updatePosts")).find(filter).sort({createdAt:-1}).limit(200).toArray();
  const views=await collection<any>("updatePostViews");
  const result=[];
  for(const p of posts){
   const actual=await views.countDocuments({postId:String(p._id)});
   result.push({...p,_id:String(p._id),actualViews:actual,displayViews:p.viewDisplayMode==="custom"?Number(p.viewDisplayValue||0):actual});
  }
  return NextResponse.json({ok:true,posts:result},{headers:{"Cache-Control":"no-store"}});
 }catch(error){
  const message=error instanceof Error?error.message:"";
  const status=message==="AUTH_REQUIRED"||message==="ADMIN_REQUIRED"?401:500;
  return NextResponse.json({ok:false,error:status===401?"Unauthorized":"Unable to load posts."},{status});
 }
}
export async function POST(req:Request){
 try{
  await requireAdmin();
  const b=await req.json().catch(()=>null),channelId=clean(b?.channelId,120),title=clean(b?.title,120),body=clean(b?.body,12000),type=clean(b?.type||"text",32);
  if(!channelId||!allowedTypes.has(type))return NextResponse.json({ok:false,error:"Choose a channel and a supported post type."},{status:400});
  if(!title&&!body)return NextResponse.json({ok:false,error:"A post needs a title or message."},{status:400});
  const channel=await (await collection<any>("updateChannels")).findOne({_id:channelId});
  if(!channel)return NextResponse.json({ok:false,error:"Channel not found."},{status:404});
  const status=b?.status==="draft"?"draft":"published",now=new Date(),media=normalizedMedia(b?.media);
  if(["image","gallery","video"].includes(type)&&!media.length)return NextResponse.json({ok:false,error:"Add at least one verified HTTPS media URL for this post."},{status:400});
  const links=Array.isArray(b?.links)?b.links.slice(0,10).map((x:any)=>safeHttps(x)).filter(Boolean):[];
  const id=mongoId(),view=display(b||{});
  const post={_id:id,channelId,title,body,type,media,links,status,viewDisplayMode:view.viewDisplayMode,viewDisplayValue:view.viewDisplayValue,createdAt:now,publishedAt:status==="published"?now:null,updatedAt:now,createdBy:String((await requireAdmin()).id)};
  await (await collection<any>("updatePosts")).insertOne(post);
  const delivery=status==="published"?await notifySubscribers(channel,post):{sent:0,failed:0};
  return NextResponse.json({ok:true,post:{...post,_id:id,actualViews:0,displayViews:view.viewDisplayMode==="custom"?view.viewDisplayValue:0},notifications:delivery},{status:201});
 }catch(error){
  const message=error instanceof Error?error.message:"";
  if(message==="AUTH_REQUIRED"||message==="ADMIN_REQUIRED")return NextResponse.json({ok:false,error:"Unauthorized"},{status:401});
  return NextResponse.json({ok:false,error:message.startsWith("Displayed views")?message:"Unable to create post."},{status:400});
 }
}
export async function PATCH(req:Request){
 try{
  await requireAdmin();
  const b=await req.json().catch(()=>null),id=clean(b?.id,120);
  if(!id)return NextResponse.json({ok:false,error:"Post ID is required."},{status:400});
  const posts=await collection<any>("updatePosts"),existing=await posts.findOne({_id:id});
  if(!existing)return NextResponse.json({ok:false,error:"Post not found."},{status:404});
  const set:Record<string,unknown>={updatedAt:new Date()};
  if(b.title!==undefined)set.title=clean(b.title,120);
  if(b.body!==undefined)set.body=clean(b.body,12000);
  if(b.type!==undefined){if(!allowedTypes.has(b.type))return NextResponse.json({ok:false,error:"Unsupported post type."},{status:400});set.type=b.type;}
  if(b.media!==undefined)set.media=normalizedMedia(b.media);
  if(b.links!==undefined)set.links=Array.isArray(b.links)?b.links.slice(0,10).map((x:any)=>safeHttps(x)).filter(Boolean):[];
  if(b.status!==undefined){if(!["draft","published","archived"].includes(b.status))return NextResponse.json({ok:false,error:"Invalid post status."},{status:400});set.status=b.status;if(b.status==="published"&&!existing.publishedAt)set.publishedAt=new Date();}
  if(b.viewDisplayMode!==undefined||b.viewDisplayValue!==undefined)Object.assign(set,display({...b,viewDisplayMode:b.viewDisplayMode??"automatic"}));
  await posts.updateOne({_id:id},{$set:set});
  const updated=await posts.findOne({_id:id});
  let notifications={sent:0,failed:0};
  if(existing.status!=="published"&&updated.status==="published"){
   const channel=await (await collection<any>("updateChannels")).findOne({_id:String(existing.channelId)});
   if(channel)notifications=await notifySubscribers(channel,updated);
  }
  return NextResponse.json({ok:true,post:{...updated,_id:id},notifications});
 }catch(error){
  const message=error instanceof Error?error.message:"";
  if(message==="AUTH_REQUIRED"||message==="ADMIN_REQUIRED")return NextResponse.json({ok:false,error:"Unauthorized"},{status:401});
  return NextResponse.json({ok:false,error:message.startsWith("Displayed views")?message:"Unable to update post."},{status:400});
 }
}
export async function DELETE(req:Request){
 try{
  await requireAdmin();
  const b=await req.json().catch(()=>null),id=clean(b?.id,120);
  if(!id)return NextResponse.json({ok:false,error:"Post ID is required."},{status:400});
  const result=await (await collection<any>("updatePosts")).deleteOne({_id:id});
  if(!result.deletedCount)return NextResponse.json({ok:false,error:"Post not found."},{status:404});
  await (await collection<any>("updatePostViews")).deleteMany({postId:id});
  return NextResponse.json({ok:true,deleted:true});
 }catch(error){
  const message=error instanceof Error?error.message:"";
  const status=message==="AUTH_REQUIRED"||message==="ADMIN_REQUIRED"?401:500;
  return NextResponse.json({ok:false,error:status===401?"Unauthorized":"Unable to delete post."},{status});
 }
}
