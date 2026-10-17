import {NextResponse} from "next/server";
import {requireUser} from "@/lib/auth";
import {collection} from "@/lib/mongo";
import {sendPush} from "@/lib/push";
export const runtime="nodejs";
export const dynamic="force-dynamic";

export async function POST(req:Request){
 try{
  const body=await req.json().catch(()=>null);
  const token=String(body?.token||"").trim();
  const platform=String(body?.platform||"android").trim().toLowerCase();
  const deviceId=String(body?.deviceId||"").trim().slice(0,160);
  const appVersion=String(body?.appVersion||"").trim().slice(0,40);
  if(!token||token.length<20)return NextResponse.json({ok:false,error:"Invalid device token."},{status:400});
  if(!String(process.env.MONGODB_URI||"").trim())return NextResponse.json({ok:false,error:"PUSH_STORAGE_NOT_CONFIGURED",message:"Notification device storage is not configured on the server."},{status:503});
  const user=await (async()=>{try{return await requireUser()}catch(error){if(error instanceof Error&&error.message==="AUTH_REQUIRED")return null;throw error;}})();
  const devices=await collection<any>("deviceTokens"),now=new Date();
  // Resolve by install identity first so token rotation replaces this install's
  // old token. Crucially, an unauthenticated startup refresh never clears an
  // existing userId while the WebView session is restoring.
  const existingByDevice=deviceId?await devices.findOne({deviceId}):null;
  const existing=existingByDevice||await devices.findOne({token});
  const filter=existing?{_id:existing._id}:deviceId?{deviceId}:{token};
  const fields:any={token,platform,updatedAt:now,lastSeenAt:now,enabled:true};
  if(deviceId)fields.deviceId=deviceId;
  if(appVersion)fields.appVersion=appVersion;
  if(user)fields.userId=String(user.id);
  await devices.updateOne(filter,{$set:fields,$setOnInsert:{createdAt:now,...(!user?{userId:null}:{})}},{upsert:true});
  console.info("[FCM_TOKEN_REGISTERED]",{authenticated:Boolean(user),linked:Boolean(user||existing?.userId),platform,deviceIdentityPresent:Boolean(deviceId),appVersion:appVersion||undefined});
  if(!user){
   const response=NextResponse.json({ok:true,registered:true,linked:Boolean(existing?.userId),pending:!existing?.userId});
   response.cookies.set("numelixa_device_token_pending",token,{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",path:"/",maxAge:60*10});
   return response;
  }
  const users=await collection<any>("users");
  const account=await users.findOne({_id:String(user.id)},{projection:{pushWelcomeSentAt:1,name:1}});
  if(!account?.pushWelcomeSentAt){
   try{
    const result=await sendPush([token],"👋 Welcome to Numelixa","Your Numelixa notifications are now active. We will alert you about SMS codes, purchases, wallet activity and important updates.",{type:"welcome",url:"/"});
    if(result.successCount>0)await users.updateOne({_id:String(user.id)},{$set:{pushWelcomeSentAt:new Date()}});
   }catch(error){console.error("[WELCOME PUSH]",error instanceof Error?error.message:"Unknown push error");}
  }
  const response=NextResponse.json({ok:true,registered:true,linked:true});
  response.cookies.set("numelixa_device_token",token,{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",path:"/",maxAge:60*60*24*365});
  response.cookies.delete("numelixa_device_token_pending");
  return response;
 }catch(error){
  const message=error instanceof Error?error.message:String(error),status=message==="AUTH_REQUIRED"?401:500;
  console.error("[NOTIFICATION DEVICE REGISTER]",{code:status===401?"AUTH_REQUIRED":"REGISTER_FAILED",message});
  return NextResponse.json({ok:false,error:status===401?"AUTH_REQUIRED":"Unable to register device."},{status});
 }
}
