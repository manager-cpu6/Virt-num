import {NextResponse} from "next/server";
import {requireSupportManager,passwordHash} from "@/lib/auth";
import {collection,mongoId} from "@/lib/mongo";
export const runtime="nodejs";
export const dynamic="force-dynamic";

export async function GET(){
 try{
  await requireSupportManager();
  const users=await (await collection<any>("users")).find({role:"support_agent"}).project({email:1,name:1,supportActive:1,createdAt:1}).sort({createdAt:1}).toArray();
  const ratings=await (await collection<any>("supportChatConversations")).aggregate([
   {$match:{assignedAdminId:{$ne:null},rating:{$type:"number"}}},
   {$group:{_id:"$assignedAdminId",ratedChats:{$sum:1},averageRating:{$avg:"$rating"},likes:{$sum:{$cond:[{$eq:["$reaction","like"]},1,0]}},dislikes:{$sum:{$cond:[{$eq:["$reaction","dislike"]},1,0]}}}}
  ]).toArray();
  const byId=new Map(ratings.map((x:any)=>[String(x._id),x]));
  return NextResponse.json({ok:true,admins:users.map((u:any)=>{const r=byId.get(String(u._id));return{id:String(u._id),email:String(u.email||""),name:String(u.name||"Support Admin"),active:u.supportActive!==false,createdAt:u.createdAt||null,ratings:{ratedChats:Number(r?.ratedChats||0),averageRating:Number(r?.averageRating||0),likes:Number(r?.likes||0),dislikes:Number(r?.dislikes||0)}}})});
 }catch{return NextResponse.json({ok:false,error:"Primary administrator access required."},{status:403})}
}

export async function POST(req:Request){
 try{
  await requireAdmin();
  const body=await req.json(),name=String(body.name||"").trim().slice(0,80),email=String(body.email||"").trim().toLowerCase(),password=String(body.password||"");
  if(name.length<2||!/^\S+@\S+\.\S+$/.test(email)||password.length<10)return NextResponse.json({ok:false,error:"Enter a name, valid email and password with at least 10 characters."},{status:400});
  if(email===(process.env.ADMIN_EMAIL||"").trim().toLowerCase())return NextResponse.json({ok:false,error:"Use a separate email for each support agent."},{status:409});
  const users=await collection<any>("users");
  const existing=await users.findOne({email});
  if(existing)return NextResponse.json({ok:false,error:"An account with this email already exists. Use another email."},{status:409});
  const now=new Date(),id=mongoId();
  await users.insertOne({_id:id,email,name,password_hash:await passwordHash(password),role:"support_agent",supportActive:true,coins:0,verifiedAt:now,createdAt:now,updatedAt:now});
  return NextResponse.json({ok:true,admin:{id,email,name,active:true,createdAt:now,ratings:{ratedChats:0,averageRating:0,likes:0,dislikes:0}}},{status:201});
 }catch{return NextResponse.json({ok:false,error:"Unable to create support admin."},{status:500})}
}

export async function PATCH(req:Request){
 try{
  await requireAdmin();
  const body=await req.json(),id=String(body.id||""),active=body.active;
  if(!id||typeof active!=="boolean")return NextResponse.json({ok:false,error:"Choose a support admin and active status."},{status:400});
  const r=await (await collection<any>("users")).updateOne({_id:id,role:"support_agent"},{$set:{supportActive:active,updatedAt:new Date()}});
  if(!r.matchedCount)return NextResponse.json({ok:false,error:"Support admin not found."},{status:404});
  if(!active)await (await collection<any>("sessions")).deleteMany({userId:id});
  return NextResponse.json({ok:true});
 }catch{return NextResponse.json({ok:false,error:"Unable to update support admin."},{status:500})}
}
