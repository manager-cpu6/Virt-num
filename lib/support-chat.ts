import {collection} from "@/lib/mongo";

export async function ensureSupportConversation(userId:string,userName=""){
 const conversations=await collection<any>("supportChatConversations");
 const existing=await conversations.findOne({userId});
 if(existing)return existing;
 const users=await collection<any>("users");
 const agents=await users.find({role:"support_admin",supportActive:{$ne:false},suspendedAt:{$exists:false}}).sort({createdAt:1,_id:1}).toArray();
 let assignedAdminId:string|null=null;
 if(agents.length){
  const counts=await conversations.aggregate([
   {$match:{assignedAdminId:{$in:agents.map((a:any)=>String(a._id))}}},
   {$group:{_id:"$assignedAdminId",count:{$sum:1}}}
  ]).toArray();
  const countById=new Map(counts.map((x:any)=>[String(x._id),Number(x.count||0)]));
  const ranked=agents.map((a:any)=>({...a,count:countById.get(String(a._id))||0}))
   .sort((a:any,b:any)=>a.count-b.count||new Date(a.createdAt||0).getTime()-new Date(b.createdAt||0).getTime());
  assignedAdminId=String(ranked[0]._id);
 }
 const user=await users.findOne({_id:String(userId)});
 const now=new Date();
 await conversations.updateOne({userId:String(userId)},{$setOnInsert:{
  userId:String(userId),userName:String(userName||user?.name||"Numelixa user"),
  userEmail:String(user?.email||""),assignedAdminId,createdAt:now,updatedAt:now,
  status:"open",rating:null,reaction:null
 }},{upsert:true});
 return conversations.findOne({userId:String(userId)});
}

export async function canAccessSupportConversation(actor:{id:string;role:string},conversationId:string){
 if(actor.role==="admin")return true;
 if(actor.role!=="support_admin")return false;
 const conversation=await (await collection<any>("supportChatConversations")).findOne({userId:String(conversationId)});
 return Boolean(conversation&&String(conversation.assignedAdminId||"")===String(actor.id));
}

export async function backfillSupportConversations(){
 const messages=await collection<any>("supportChatMessages");
 const ids=await messages.distinct("conversationId",{});
 for(const id of ids){
  const userId=String(id||"");
  if(!userId)continue;
  const first=await messages.findOne({conversationId:userId},{sort:{createdAt:1}});
  await ensureSupportConversation(userId,String(first?.senderName||""));
 }
}
