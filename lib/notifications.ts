import {cookies} from "next/headers";
import {collection,mongoId} from "@/lib/mongo";
import {sendPush} from "@/lib/push";

export async function claimDeviceTokenForUser(userId:string){
 const token=String((await cookies()).get("numelixa_device_token")?.value||"").trim();
 if(token.length<20)return false;
 const result=await (await collection<any>("deviceTokens")).updateOne(
  {token},
  {$set:{userId:String(userId),updatedAt:new Date(),lastSeenAt:new Date()}}
 );
 return result.matchedCount>0||result.modifiedCount>0;
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
