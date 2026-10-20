import {NextResponse} from "next/server";
import {getUser,requireAdmin} from "@/lib/auth";
import {collection,mongoId} from "@/lib/mongo";
export const runtime="nodejs";
export const dynamic="force-dynamic";
const clean=(x:unknown,n=4000)=>String(x??"").trim().slice(0,n);
function visible(m:any){return {id:String(m._id),conversationId:String(m.conversationId||""),senderRole:m.senderRole==="admin"?"admin":"user",senderName:String(m.senderName||""),text:String(m.text||""),attachments:Array.isArray(m.attachments)?m.attachments:[],createdAt:m.createdAt,readAt:m.readAt||null};}
export async function GET(req:Request){
 try{
  const user=await getUser();if(!user)return NextResponse.json({ok:false,error:"Please sign in again."},{status:401});
  const admin=user.role==="admin",url=new URL(req.url),conversationId=clean(url.searchParams.get("conversationId"),160);
  const messages=await collection<any>("supportChatMessages");
  if(admin){
   if(conversationId){
    const rows=await messages.find({conversationId}).sort({createdAt:1}).limit(250).toArray();
    await messages.updateMany({conversationId,senderRole:"user",readAt:null},{$set:{readAt:new Date()}});
    return NextResponse.json({ok:true,messages:rows.map(visible),conversationId});
   }
   const rows=await messages.aggregate([
    {$sort:{createdAt:-1}},{$group:{_id:"$conversationId",last:{$first:"$$ROOT"},unread:{$sum:{$cond:[{$and:[{$eq:["$senderRole","user"]},{$eq:["$readAt",null]}]},1,0]}}}},
    {$sort:{"last.createdAt":-1}},{$limit:150}
   ]).toArray();
   const users=await collection<any>("users");
   const ids=rows.map(x=>String(x._id));
   const userRows=await users.find({_id:{$in:ids}}).project({email:1,name:1}).toArray();
   const byId=new Map(userRows.map((x:any)=>[String(x._id),x]));
   return NextResponse.json({ok:true,conversations:rows.map((x:any)=>({id:String(x._id),userName:String(byId.get(String(x._id))?.name||x.last.senderName||"Numelixa user"),userEmail:String(byId.get(String(x._id))?.email||""),lastMessage:visible(x.last),unread:Number(x.unread||0)}))});
  }
  const rows=await messages.find({conversationId:String(user.id)}).sort({createdAt:1}).limit(250).toArray();
  await messages.updateMany({conversationId:String(user.id),senderRole:"admin",readAt:null},{$set:{readAt:new Date()}});
  return NextResponse.json({ok:true,conversationId:String(user.id),messages:rows.map(visible)});
 }catch{return NextResponse.json({ok:false,error:"Help Team chat is temporarily unavailable."},{status:500})}
}
export async function POST(req:Request){
 try{
  const user=await getUser();if(!user)return NextResponse.json({ok:false,error:"Please sign in again."},{status:401});
  const body=await req.json(),text=clean(body.text,4000),raw=Array.isArray(body.attachments)?body.attachments.slice(0,4):[];
  const admin=user.role==="admin",conversationId=admin?clean(body.conversationId,160):String(user.id);
  if(!conversationId)return NextResponse.json({ok:false,error:"Choose a conversation."},{status:400});
  const attachments=raw.map((a:any)=>({name:clean(a.name,120),mime:clean(a.mime,100),data:clean(a.data,7_000_000),kind:["image","audio","file"].includes(a.kind)?a.kind:"file"}));
  if(!text&&!attachments.length)return NextResponse.json({ok:false,error:"Write a message or attach a file."},{status:400});
  if(attachments.some((a:any)=>!a.data.startsWith("data:")||a.data.length>7_000_000))return NextResponse.json({ok:false,error:"Attachments must be valid and smaller than 5 MB each."},{status:400});
  const users=await collection<any>("users"),recipient=admin?await users.findOne({_id:conversationId}):null;
  if(admin&&!recipient)return NextResponse.json({ok:false,error:"Conversation user not found."},{status:404});
  const now=new Date(),id=mongoId(),senderRole=admin?"admin":"user";
  const message={_id:id,conversationId,senderRole,senderId:String(user.id),senderName:clean(user.name||user.email|| (admin?"Numelixa Help Team":"User"),100),text,attachments,createdAt:now,readAt:null};
  await (await collection<any>("supportChatMessages")).insertOne(message);
  try{
   const tokens=await collection<any>("deviceTokens");
   const targetUser=admin?conversationId:null;
   const deviceRows=targetUser?await tokens.find({userId:targetUser}).project({token:1}).toArray():[];
   if(deviceRows.length){
    const {getMessaging}=await import("firebase-admin/messaging");
    const {getFirebaseAdmin}=await import("@/lib/firebase-admin");
    const app=await getFirebaseAdmin();
    if(app)await getMessaging(app).sendEachForMulticast({tokens:deviceRows.map((x:any)=>String(x.token)).filter(Boolean),notification:{title:"Numelixa Help Team",body:text||"You received a new attachment."},data:{type:"support_chat",conversationId},android:{priority:"high",notification:{channelId:"numelixa_support_chat"}}});
   }
  }catch(e){console.error("[SUPPORT CHAT PUSH]",e)}
  return NextResponse.json({ok:true,message:visible(message)});
 }catch{return NextResponse.json({ok:false,error:"Could not send the message. Please try again."},{status:500})}
}