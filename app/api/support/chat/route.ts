import {NextResponse} from "next/server";
import {getUser} from "@/lib/auth";
import {collection,mongoId} from "@/lib/mongo";
import {sendPush} from "@/lib/push";
import {backfillSupportConversations,canAccessSupportConversation,ensureSupportConversation} from "@/lib/support-chat";
export const runtime="nodejs";
export const dynamic="force-dynamic";
const clean=(x:unknown,n=4000)=>String(x??"").trim().slice(0,n);
const isStaff=(role:string)=>role==="admin"||role==="support_admin";
function visible(m:any){return {id:String(m._id),conversationId:String(m.conversationId||""),senderRole:m.senderRole==="admin"?"admin":"user",senderId:String(m.senderId||""),senderName:String(m.senderName||""),text:String(m.text||""),attachments:Array.isArray(m.attachments)?m.attachments:[],createdAt:m.createdAt,readAt:m.readAt||null};}

export async function GET(req:Request){
 try{
  const user=await getUser();if(!user)return NextResponse.json({ok:false,error:"Please sign in again."},{status:401});
  const url=new URL(req.url),conversationId=clean(url.searchParams.get("conversationId"),160);
  const messages=await collection<any>("supportChatMessages");
  const conversations=await collection<any>("supportChatConversations");
  if(isStaff(String(user.role||""))){
   if(conversationId){
    if(!await canAccessSupportConversation(user,conversationId))return NextResponse.json({ok:false,error:"This conversation is not assigned to your support account."},{status:403});
    const rows=await messages.find({conversationId}).sort({createdAt:1}).limit(500).toArray();
    await messages.updateMany({conversationId,senderRole:"user",readAt:null},{$set:{readAt:new Date()}});
    const conversation=await conversations.findOne({userId:conversationId});
    return NextResponse.json({ok:true,messages:rows.map(visible),conversationId,conversation:conversation?{status:conversation.status||"open",rating:conversation.rating??null,reaction:conversation.reaction??null,assignedAdminId:conversation.assignedAdminId||null}:null});
   }
   await backfillSupportConversations();
   const rows=await messages.aggregate([
    {$sort:{createdAt:-1}},{$group:{_id:"$conversationId",last:{$first:"$$ROOT"},unread:{$sum:{$cond:[{$and:[{$eq:["$senderRole","user"]},{$eq:["$readAt",null]}]},1,0]}}}},
    {$sort:{"last.createdAt":-1}},{$limit:250}
   ]).toArray();
   const ids=rows.map(x=>String(x._id));
   const filters:any={userId:{$in:ids}};
   if(user.role==="support_admin")filters.assignedAdminId=String(user.id);
   const convRows=await conversations.find(filters).toArray();
   const convByUser=new Map(convRows.map((x:any)=>[String(x.userId),x]));
   const allowedIds=new Set(convRows.map((x:any)=>String(x.userId)));
   const visibleRows=user.role==="admin"?rows:rows.filter((x:any)=>allowedIds.has(String(x._id)));
   const users=await collection<any>("users");
   const userRows=await users.find({_id:{$in:visibleRows.map((x:any)=>String(x._id))}}).project({email:1,name:1}).toArray();
   const byId=new Map(userRows.map((x:any)=>[String(x._id),x]));
   return NextResponse.json({ok:true,conversations:visibleRows.map((x:any)=>{
    const id=String(x._id),u=byId.get(id),conv=convByUser.get(id);
    return {id,userName:String(u?.name||x.last.senderName||"Numelixa user"),userEmail:String(u?.email||""),lastMessage:visible(x.last),unread:Number(x.unread||0),status:conv?.status||"open",rating:conv?.rating??null,reaction:conv?.reaction??null,assignedAdminId:conv?.assignedAdminId||null};
   })});
  }
  const ownId=String(user.id);
  const conversation=await ensureSupportConversation(ownId,String(user.name||""));
  const rows=await messages.find({conversationId:ownId}).sort({createdAt:1}).limit(500).toArray();
  await messages.updateMany({conversationId:ownId,senderRole:"admin",readAt:null},{$set:{readAt:new Date()}});
  return NextResponse.json({ok:true,conversationId:ownId,messages:rows.map(visible),conversation:conversation?{status:conversation.status||"open",rating:conversation.rating??null,reaction:conversation.reaction??null}:null});
 }catch(error){console.error("[SUPPORT CHAT GET]",error);return NextResponse.json({ok:false,error:"Help Team chat is temporarily unavailable."},{status:500})}
}

export async function POST(req:Request){
 try{
  const user=await getUser();if(!user)return NextResponse.json({ok:false,error:"Please sign in again."},{status:401});
  const body=await req.json();
  if(body.action==="rate"){
   if(isStaff(String(user.role||"")))return NextResponse.json({ok:false,error:"Only the customer can rate this support chat."},{status:403});
   const rating=Number(body.rating),reaction=String(body.reaction||"");
   if(!Number.isInteger(rating)||rating<1||rating>5||!["like","dislike"].includes(reaction))return NextResponse.json({ok:false,error:"Choose a 1–5 star rating and a like/dislike reaction."},{status:400});
   await ensureSupportConversation(String(user.id),String(user.name||""));
   await (await collection<any>("supportChatConversations")).updateOne({userId:String(user.id)},{$set:{rating,reaction,ratedAt:new Date(),updatedAt:new Date()}});
   return NextResponse.json({ok:true,rating,reaction});
  }
  const text=clean(body.text,4000),raw=Array.isArray(body.attachments)?body.attachments.slice(0,1):[];
  const staff=isStaff(String(user.role||""));
  const conversationId=staff?clean(body.conversationId,160):String(user.id);
  if(!conversationId)return NextResponse.json({ok:false,error:"Choose a conversation."},{status:400});
  if(staff&&!await canAccessSupportConversation(user,conversationId))return NextResponse.json({ok:false,error:"This conversation is not assigned to your support account."},{status:403});
  const attachments=raw.map((a:any)=>({name:clean(a.name,120),mime:clean(a.mime,100),data:clean(a.data,4_300_000),kind:["image","audio","video","file"].includes(a.kind)?a.kind:"file"}));
  if(!text&&!attachments.length)return NextResponse.json({ok:false,error:"Write a message or attach a file."},{status:400});
  if(attachments.some((a:any)=>!a.data.startsWith("data:")||a.data.length>4_300_000||!/^data:(image|audio|video)\//i.test(a.data)))return NextResponse.json({ok:false,error:"Attach one image, video or voice note under 3 MB."},{status:400});
  const users=await collection<any>("users");
  const recipient=staff?await users.findOne({_id:conversationId}):null;
  if(staff&&!recipient)return NextResponse.json({ok:false,error:"Conversation user not found."},{status:404});
  if(!staff)await ensureSupportConversation(conversationId,String(user.name||""));
  const now=new Date(),id=mongoId(),senderRole=staff?"admin":"user";
  const message={_id:id,conversationId,senderRole,senderId:String(user.id),senderName:clean(user.name||user.email||(staff?"Numelixa Help Team":"User"),100),text,attachments,createdAt:now,readAt:null};
  await (await collection<any>("supportChatMessages")).insertOne(message);
  await (await collection<any>("supportChatConversations")).updateOne({userId:conversationId},{$set:{updatedAt:now,status:"open"}});
  if(staff){
   try{
    const deviceRows=await (await collection<any>("deviceTokens")).find({userId:conversationId}).project({token:1}).toArray();
    if(deviceRows.length)await sendPush(deviceRows.map((x:any)=>String(x.token)),"Numelixa Help Team",text||"You received a new attachment.",{type:"support_chat",conversationId,url:"/account"});
   }catch(e){console.error("[SUPPORT CHAT PUSH]",e)}
  }
  return NextResponse.json({ok:true,message:visible(message)});
 }catch(error){console.error("[SUPPORT CHAT POST]",error);return NextResponse.json({ok:false,error:"Could not send the message. Please try again."},{status:500})}
}

export async function DELETE(req:Request){
 try{
  const user=await getUser();if(!user)return NextResponse.json({ok:false,error:"Please sign in again."},{status:401});
  const url=new URL(req.url),messageId=clean(url.searchParams.get("messageId"),160),conversationId=clean(url.searchParams.get("conversationId"),160),clear=url.searchParams.get("clear")==="true";
  const messages=await collection<any>("supportChatMessages");
  if(clear){
   if(!isStaff(String(user.role||""))||!conversationId)return NextResponse.json({ok:false,error:"Staff access and a conversation are required."},{status:403});
   if(!await canAccessSupportConversation(user,conversationId))return NextResponse.json({ok:false,error:"This conversation is not assigned to your support account."},{status:403});
   await messages.deleteMany({conversationId});
   await (await collection<any>("supportChatConversations")).deleteOne({userId:conversationId});
   return NextResponse.json({ok:true,cleared:true});
  }
  if(!messageId)return NextResponse.json({ok:false,error:"Message ID is required."},{status:400});
  const message=await messages.findOne({_id:messageId});
  if(!message)return NextResponse.json({ok:false,error:"Message not found."},{status:404});
  if(!Array.isArray(message.attachments)||!message.attachments.some((a:any)=>a.kind==="audio"))return NextResponse.json({ok:false,error:"Only voice messages can be deleted from this action."},{status:400});
  if(isStaff(String(user.role||""))){
   if(!await canAccessSupportConversation(user,String(message.conversationId)))return NextResponse.json({ok:false,error:"This conversation is not assigned to your support account."},{status:403});
  }else if(String(message.conversationId)!==String(user.id)||String(message.senderId)!==String(user.id)){
   return NextResponse.json({ok:false,error:"You can only delete your own voice messages."},{status:403});
  }
  await messages.deleteOne({_id:messageId});
  return NextResponse.json({ok:true,deleted:true});
 }catch(error){console.error("[SUPPORT CHAT DELETE]",error);return NextResponse.json({ok:false,error:"Could not delete this chat item."},{status:500})}
}
