import {cookies} from "next/headers";
import {collection,mongoId} from "@/lib/mongo";
import {sendPush} from "@/lib/push";

export async function claimDeviceTokenForUser(userId:string){
 const jar=await cookies();
 const token=String(
  jar.get("numelixa_device_token")?.value||
  jar.get("numelixa_device_token_pending")?.value||
  ""
 ).trim();
 if(token.length<20)return false;

 const devices=await collection<any>("deviceTokens");
 const users=await collection<any>("users");
 const now=new Date();

 await devices.updateOne(
  {token},
  {$set:{token,userId:String(userId),updatedAt:now,lastSeenAt:now},$setOnInsert:{createdAt:now}},
  {upsert:true}
 );

 // Convert the pending handoff into the normal authenticated device cookie.
 try{
  jar.set("numelixa_device_token",token,{
   httpOnly:true,
   secure:process.env.NODE_ENV==="production",
   sameSite:"lax",
   path:"/",
   maxAge:60*60*24*365
  });
  jar.delete("numelixa_device_token_pending");
 }catch{}

 // Send the first-device welcome from the authenticated server path. This
 // also works when the login happens before the browser event fires.
 const account=await users.findOne({_id:String(userId)},{projection:{pushWelcomeSentAt:1}});
 if(!account?.pushWelcomeSentAt){
  try{
   const result=await sendPush(
    [token],
    "👋 Welcome to Numelixa",
    "Your Numelixa notifications are now active. We will alert you about SMS codes, purchases, wallet activity and important updates.",
    {type:"welcome",url:"/"}
   );
   if(result.successCount>0){
    await users.updateOne({_id:String(userId)},{$set:{pushWelcomeSentAt:new Date()}});
   }
  }catch(error){
   console.error("[WELCOME PUSH CLAIM]",error);
  }
 }
 return true;
}

export async function notifyUser(
 userId:string,
 title:string,
 message:string,
 data:Record<string,string>={}
){
 const id=mongoId();
 const createdAt=new Date();
 const notifications=await collection<any>("notifications");

 await notifications.insertOne({
  _id:id,
  userId:String(userId),
  title,
  message,
  createdAt,
  readAt:null,
  systemSent:true,
  sentCount:0,
  pushConfigured:false
 });

 let sent=0;
 let pushConfigured=false;
 try{
  const devices=await (await collection<any>("deviceTokens"))
   .find({userId:String(userId)})
   .toArray();

  const result=await sendPush(
   devices.map((d)=>String(d.token||"")),
   title,
   message,
   {url:data.url||"/",...data}
  );

  sent=result.successCount;
  pushConfigured=result.configured;

  if(result.invalidTokens?.length){
   await (await collection<any>("deviceTokens"))
    .deleteMany({token:{$in:result.invalidTokens}});
  }
 }catch(error){
  console.error("[PUSH USER]",{
   userId,
   message:error instanceof Error?error.message:String(error)
  });
 }

 await notifications.updateOne(
  {_id:id},
  {$set:{sentCount:sent,pushConfigured,updatedAt:new Date()}}
 );

 return {id,sent,pushConfigured};
}
