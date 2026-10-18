import {NextResponse} from "next/server";
import {cookies} from "next/headers";
import {getUser} from "@/lib/auth";
import {collection} from "@/lib/mongo";
import {isFirebaseConfigured} from "@/lib/push";

export const runtime="nodejs";
export const dynamic="force-dynamic";

export async function GET(){
 try{
  const user=await getUser();
  const userId=user?String(user.id):"";
  const token=String((await cookies()).get("numelixa_device_token")?.value||"").trim();
  const devices=await collection<any>("deviceTokens");
  const linkedRows=userId
   ?await devices.find({userId,platform:"android",enabled:{$ne:false}},{projection:{platform:1,createdAt:1,updatedAt:1,lastSeenAt:1,deviceId:1,appVersion:1}}).sort({updatedAt:-1}).limit(20).toArray()
   :[];
  const cookieRow=token?await devices.findOne({token},{projection:{userId:1,platform:1,createdAt:1,updatedAt:1,lastSeenAt:1,deviceId:1,appVersion:1}}):null;
  const linkedCount=linkedRows.length;
  const latest=linkedRows[0]||null;
  return NextResponse.json({
   ok:true,
   firebaseServerConfigured:await isFirebaseConfigured(),
   browserOrAppSession:Boolean(user),
   deviceCookie:Boolean(token),
   deviceRegistered:Boolean(linkedCount||cookieRow),
   deviceLinked:Boolean(userId&&linkedCount>0),
   platform:String(latest?.platform||cookieRow?.platform||""),
   registeredAt:latest?.createdAt||cookieRow?.createdAt||null,
   lastSeenAt:latest?.lastSeenAt||latest?.updatedAt||cookieRow?.lastSeenAt||cookieRow?.updatedAt||null,
   linkedDeviceCount:linkedCount,
   devices:linkedRows.map(row=>({platform:String(row.platform||""),appVersion:String(row.appVersion||""),deviceIdentityPresent:Boolean(row.deviceId),registeredAt:row.createdAt||null,lastSeenAt:row.lastSeenAt||row.updatedAt||null}))
  },{headers:{"Cache-Control":"no-store"}});
 }catch(error){
  console.error("[NOTIFICATION DIAGNOSTICS]",error instanceof Error?error.message:"Unable to read notification diagnostics.");
  return NextResponse.json({ok:false,error:"Unable to read notification diagnostics."},{status:500,headers:{"Cache-Control":"no-store"}});
 }
}
