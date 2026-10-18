import crypto from "crypto";
import {NextResponse} from "next/server";
import {requireUser} from "@/lib/auth";
import {collection} from "@/lib/mongo";

export const runtime="nodejs";
export const dynamic="force-dynamic";
const hash=(v:string)=>crypto.createHash("sha256").update(v).digest("hex");

export async function GET(req:Request){
 try{
  const user=await requireUser();
  const auth=String(req.headers.get("authorization")||"");
  const raw=auth.toLowerCase().startsWith("bearer ")?auth.slice(7).trim():"";
  const currentHash=raw?hash(raw):"";
  const rows=await (await collection<any>("sessions"))
   .find({userId:String(user.id),expiresAt:{$gt:new Date()}})
   .sort({lastSeenAt:-1,createdAt:-1}).toArray();
  const grouped=new Map<string,any>();
  for(const session of rows){
   const deviceId=String(session.deviceId||"");
   const key=deviceId||"session:"+String(session._id);
   const existing=grouped.get(key);
   const current=Boolean(currentHash&&session.tokenHash===currentHash);
   if(existing){
    existing.current=existing.current||current;
    existing.sessionIds.push(String(session._id));
    if(new Date(session.lastSeenAt||session.createdAt||0)>new Date(existing.lastSeenAt||0))existing.lastSeenAt=session.lastSeenAt||session.createdAt;
    continue;
   }
   grouped.set(key,{
    deviceId:deviceId||String(session._id),
    sessionId:String(session._id),
    sessionIds:[String(session._id)],
    current,
    device:String(session.device||"Device"),
    browser:String(session.browser||"App"),
    platform:String(session.platform||"Unknown"),
    city:String(session.city||""),
    region:String(session.region||""),
    country:String(session.country||""),
    createdAt:session.createdAt||null,
    lastSeenAt:session.lastSeenAt||session.createdAt||null,
    expiresAt:session.expiresAt||null
   });
  }
  return NextResponse.json({ok:true,devices:Array.from(grouped.values())},{headers:{"Cache-Control":"no-store"}});
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
  const sessionId=String(body?.sessionId||"").trim();
  if(!deviceId&&!sessionId)return NextResponse.json({ok:false,error:"Device ID is required."},{status:400});
  const sessions=await collection<any>("sessions");
  let removed=0;
  if(deviceId&&deviceId!==sessionId){
   const result=await sessions.deleteMany({userId:String(user.id),deviceId});
   removed=result.deletedCount||0;
   await (await collection<any>("deviceTokens")).updateMany(
    {userId:String(user.id),deviceId},
    {$set:{enabled:false,revokedAt:new Date(),updatedAt:new Date()}}
   );
  }else{
   const result=await sessions.deleteOne({_id:sessionId,userId:String(user.id)});
   removed=result.deletedCount||0;
  }
  if(!removed)return NextResponse.json({ok:false,error:"Device session not found or already removed."},{status:404});
  return NextResponse.json({ok:true,removed:true});
 }catch(error){
  const message=error instanceof Error?error.message:"Unable to remove device.";
  return NextResponse.json({ok:false,error:message==="AUTH_REQUIRED"?"Please sign in again.":"Unable to remove device."},{status:message==="AUTH_REQUIRED"?401:500});
 }
}
