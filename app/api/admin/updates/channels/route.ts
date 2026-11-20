import {NextResponse} from "next/server";
import {requireAdmin} from "@/lib/auth";
import {collection,mongoId} from "@/lib/mongo";
export const runtime="nodejs";
export const dynamic="force-dynamic";
const clean=(v:unknown,max:number)=>String(v??"").trim().slice(0,max);
const slugify=(v:string)=>v.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g,"-").replace(/^-|-$/g,"").slice(0,60);
function safeUrl(v:unknown){const value=clean(v,1500);if(!value)return "";try{const u=new URL(value);return u.protocol==="https:"?u.toString():""}catch{return ""}}
function displayValue(body:any){const mode=body.subscriberDisplayMode==="custom"?"custom":"automatic";const value=Number(body.subscriberDisplayValue??0);if(mode==="custom"&&(!Number.isSafeInteger(value)||value<0||value>1000000000))throw new Error("Subscriber display value must be a whole number from 0 to 1,000,000,000.");return {subscriberDisplayMode:mode,subscriberDisplayValue:mode==="custom"?value:null};}
export async function GET(){
 try{
  await requireAdmin();
  const rows=await (await collection<any>("updateChannels")).find({}).sort({updatedAt:-1}).limit(200).toArray();
  const subs=await collection<any>("updateSubscriptions");
  const posts=await collection<any>("updatePosts");
  const output=[];
  for(const c of rows){
   const id=String(c._id);
   const [actualSubscribers,postCount]=await Promise.all([subs.countDocuments({channelId:id}),posts.countDocuments({channelId:id})]);
   output.push({...c,_id:id,actualSubscribers,postCount,publicSubscribers:c.subscriberDisplayMode==="custom"?Number(c.subscriberDisplayValue||0):actualSubscribers});
  }
  return NextResponse.json({ok:true,channels:output},{headers:{"Cache-Control":"no-store"}});
 }catch(error){
  const message=error instanceof Error?error.message:"";
  const status=message==="AUTH_REQUIRED"||message==="ADMIN_REQUIRED"?401:500;
  return NextResponse.json({ok:false,error:status===401?"Unauthorized":"Unable to load channels."},{status});
 }
}
export async function POST(req:Request){
 try{
  await requireAdmin();
  const b=await req.json().catch(()=>null);
  const name=clean(b?.name,80),slug=slugify(clean(b?.slug||name,80)),description=clean(b?.description,500),category=clean(b?.category||"General",50);
  if(name.length<2||!slug)return NextResponse.json({ok:false,error:"Enter a channel name and a valid unique slug."},{status:400});
  const status=["active","inactive","archived"].includes(b?.status)?b.status:"active";
  const visibility=b?.visibility==="private"?"private":"public";
  const display=displayValue(b||{});
  const now=new Date(),id=mongoId();
  const channel={_id:id,name,slug,description,category,avatarUrl:safeUrl(b?.avatarUrl),coverUrl:safeUrl(b?.coverUrl),verified:b?.verified===true,featured:b?.featured===true,status,visibility,...display,createdAt:now,updatedAt:now,createdBy:String((await requireAdmin()).id)};
  await (await collection<any>("updateChannels")).insertOne(channel);
  return NextResponse.json({ok:true,channel:{...channel,_id:id,actualSubscribers:0,postCount:0}},{status:201});
 }catch(error){
  const message=error instanceof Error?error.message:"";
  if((error as any)?.code===11000)return NextResponse.json({ok:false,error:"That channel slug is already in use."},{status:409});
  if(message==="AUTH_REQUIRED"||message==="ADMIN_REQUIRED")return NextResponse.json({ok:false,error:"Unauthorized"},{status:401});
  return NextResponse.json({ok:false,error:message.startsWith("Subscriber display")?message:"Unable to create channel."},{status:400});
 }
}
export async function PATCH(req:Request){
 try{
  await requireAdmin();
  const b=await req.json().catch(()=>null),id=clean(b?.id,120);
  if(!id)return NextResponse.json({ok:false,error:"Channel ID is required."},{status:400});
  const set:Record<string,unknown>={updatedAt:new Date()};
  if(b.name!==undefined){const v=clean(b.name,80);if(v.length<2)return NextResponse.json({ok:false,error:"Channel name is too short."},{status:400});set.name=v;}
  if(b.slug!==undefined){const v=slugify(clean(b.slug,80));if(!v)return NextResponse.json({ok:false,error:"Enter a valid channel slug."},{status:400});set.slug=v;}
  for(const key of ["description","category"] as const)if(b[key]!==undefined)set[key]=clean(b[key],key==="description"?500:50);
  for(const key of ["avatarUrl","coverUrl"] as const)if(b[key]!==undefined)set[key]=safeUrl(b[key]);
  for(const key of ["verified","featured"] as const)if(b[key]!==undefined){if(typeof b[key]!=="boolean")return NextResponse.json({ok:false,error:"Invalid channel flag."},{status:400});set[key]=b[key];}
  if(b.status!==undefined){if(!["active","inactive","archived"].includes(b.status))return NextResponse.json({ok:false,error:"Invalid channel status."},{status:400});set.status=b.status;}
  if(b.visibility!==undefined){if(!["public","private","unlisted"].includes(b.visibility))return NextResponse.json({ok:false,error:"Invalid visibility."},{status:400});set.visibility=b.visibility;}
  if(b.subscriberDisplayMode!==undefined||b.subscriberDisplayValue!==undefined)Object.assign(set,displayValue({...b,subscriberDisplayMode:b.subscriberDisplayMode??"automatic"}));
  const result=await (await collection<any>("updateChannels")).updateOne({_id:id},{$set:set});
  if(!result.matchedCount)return NextResponse.json({ok:false,error:"Channel not found."},{status:404});
  const channel=await (await collection<any>("updateChannels")).findOne({_id:id});
  return NextResponse.json({ok:true,channel:{...channel,_id:id}});
 }catch(error){
  const message=error instanceof Error?error.message:"";
  if((error as any)?.code===11000)return NextResponse.json({ok:false,error:"That channel slug is already in use."},{status:409});
  if(message==="AUTH_REQUIRED"||message==="ADMIN_REQUIRED")return NextResponse.json({ok:false,error:"Unauthorized"},{status:401});
  return NextResponse.json({ok:false,error:message.startsWith("Subscriber display")?message:"Unable to update channel."},{status:400});
 }
}
export async function DELETE(req:Request){
 try{
  await requireAdmin();
  const b=await req.json().catch(()=>null),id=clean(b?.id,120);
  if(!id)return NextResponse.json({ok:false,error:"Channel ID is required."},{status:400});
  if(b?.archive===true){
   const result=await (await collection<any>("updateChannels")).updateOne({_id:id},{$set:{status:"archived",updatedAt:new Date()}});
   if(!result.matchedCount)return NextResponse.json({ok:false,error:"Channel not found."},{status:404});
   return NextResponse.json({ok:true,archived:true});
  }
  const channel=await (await collection<any>("updateChannels")).findOne({_id:id});
  if(!channel)return NextResponse.json({ok:false,error:"Channel not found."},{status:404});
  const [members,posts,views]=await Promise.all([collection<any>("updateSubscriptions"),collection<any>("updatePosts"),collection<any>("updatePostViews")]);
  await Promise.all([members.deleteMany({channelId:id}),collection<any>("updateBlocks").then(c=>c.deleteMany({channelId:id})),posts.deleteMany({channelId:id})]);
  const postIds=(await posts.find({channelId:id},{projection:{_id:1}}).toArray()).map(x=>String(x._id));
  if(postIds.length)await views.deleteMany({postId:{$in:postIds}});
  await (await collection<any>("updateChannels")).deleteOne({_id:id});
  return NextResponse.json({ok:true,deleted:true});
 }catch(error){
  const message=error instanceof Error?error.message:"";
  const status=message==="AUTH_REQUIRED"||message==="ADMIN_REQUIRED"?401:500;
  return NextResponse.json({ok:false,error:status===401?"Unauthorized":"Unable to delete channel."},{status});
 }
}
