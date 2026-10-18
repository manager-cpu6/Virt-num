import {NextResponse} from "next/server";
import {requireUser} from "@/lib/auth";
import {collection} from "@/lib/mongo";

export const runtime="nodejs";
export const dynamic="force-dynamic";

export async function GET(){
 try{
  const user=await requireUser();
  const rows=await (await collection<any>("deviceTokens"))
   .find({userId:String(user.id),enabled:{$ne:false}})
   .project({token:0})
   .sort({lastSeenAt:-1,updatedAt:-1})
   .toArray();
  return NextResponse.json({ok:true,devices:rows.map((d:any)=>({
   deviceId:String(d.deviceId||d._id||""),
   deviceName:String(d.deviceName||d.deviceModel||d.platform||"Device"),
   deviceModel:String(d.deviceModel||""),
   platform:String(d.platform||"unknown"),
   appVersion:String(d.appVersion||""),
   lastSeenAt:d.lastSeenAt||d.updatedAt||d.createdAt||null,
   createdAt:d.createdAt||null,
   location:String(d.location||"Not collected")
  }))},{headers:{"Cache-Control":"no-store"}});
 }catch(error){
  const message=error instanceof Error?error.message:"Unable to load devices.";
  return NextResponse.json({ok:false,error:message==="AUTH_REQUIRED"?"Please sign in again.":"Unable to load devices."},{status:message==="AUTH_REQUIRED"?401:500});
 }
}

export async function DELETE(req:Request){
 try{
  const user=await requireUser();
  const body=await req.json().catch(()=>null);
  const deviceId=String(body?.deviceId||"").trim();
  if(!deviceId)return NextResponse.json({ok:false,error:"Device ID is required."},{status:400});
  const result=await (await collection<any>("deviceTokens")).updateOne(
   {userId:String(user.id),deviceId},
   {$set:{enabled:false,revokedAt:new Date(),updatedAt:new Date()}}
  );
  if(!result.matchedCount)return NextResponse.json({ok:false,error:"Device not found or already removed."},{status:404});
  return NextResponse.json({ok:true,removed:true});
 }catch(error){
  const message=error instanceof Error?error.message:"Unable to remove device.";
  return NextResponse.json({ok:false,error:message==="AUTH_REQUIRED"?"Please sign in again.":"Unable to remove device."},{status:message==="AUTH_REQUIRED"?401:500});
 }
}
