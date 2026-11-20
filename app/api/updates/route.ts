import {NextResponse} from "next/server";
import {requireUser} from "@/lib/auth";
import {collection} from "@/lib/mongo";
export const runtime="nodejs";
export const dynamic="force-dynamic";

function publicChannel(channel:any,actual:number){
 const mode=channel.subscriberDisplayMode==="custom"?"custom":"automatic";
 const custom=Number(channel.subscriberDisplayValue);
 return {
  id:String(channel._id),slug:String(channel.slug),name:String(channel.name||""),
  description:String(channel.description||""),category:String(channel.category||"General"),
  avatarUrl:String(channel.avatarUrl||""),coverUrl:String(channel.coverUrl||""),
  verified:channel.verified===true,featured:channel.featured===true,
  actualSubscriberCount:actual,
  publicSubscriberCount:mode==="custom"&&Number.isSafeInteger(custom)&&custom>=0?custom:actual,
  subscriberDisplayMode:mode,
  latestPost:channel.latestPost||null,updatedAt:channel.updatedAt||channel.createdAt||null
 };
}
export async function GET(){
 try{
  const user=await requireUser();
  const settings=await (await collection<any>("settings")).findOne({_id:"updates"});
  const account=await (await collection<any>("users")).findOne({_id:String(user.id)},{projection:{updatesPreferences:1}});
  const preferences=account?.updatesPreferences||{};
  const enabled=settings?.enabled===true;
  const hidden=preferences.hideUpdates===true;
  const notificationsEnabled=preferences.notificationsEnabled!==false;
  if(!enabled||hidden)return NextResponse.json({ok:true,enabled,hidden,notificationsEnabled,channels:[]},{headers:{"Cache-Control":"no-store"}});
  const blocks=await (await collection<any>("updateBlocks")).find({userId:String(user.id)},{projection:{channelId:1}}).toArray();
  const blocked=new Set(blocks.map(x=>String(x.channelId)));
  const channels=await (await collection<any>("updateChannels")).find({status:"active",visibility:{$ne:"private"}}).sort({featured:-1,updatedAt:-1}).limit(100).toArray();
  const posts=await collection<any>("updatePosts");
  const subscriptions=await collection<any>("updateSubscriptions");
  const output=[];
  for(const channel of channels){
   const id=String(channel._id);
   if(blocked.has(id))continue;
   const [actual,latest]=await Promise.all([
    subscriptions.countDocuments({channelId:id}),
    posts.findOne({channelId:id,status:"published"},{sort:{publishedAt:-1}})
   ]);
   const latestPost=latest?{id:String(latest._id),title:String(latest.title||""),body:String(latest.body||""),publishedAt:latest.publishedAt||null,type:String(latest.type||"text")}:null;
   output.push(publicChannel({...channel,latestPost},actual));
  }
  return NextResponse.json({ok:true,enabled:true,hidden:false,notificationsEnabled,channels:output},{headers:{"Cache-Control":"no-store"}});
 }catch(error){
  const message=error instanceof Error?error.message:"";
  const status=message==="AUTH_REQUIRED"?401:500;
  return NextResponse.json({ok:false,error:status===401?"Please sign in again.":"Unable to load Numelixa Updates."},{status,headers:{"Cache-Control":"no-store"}});
 }
}
