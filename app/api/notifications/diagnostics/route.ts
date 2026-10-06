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
  const token=String((await cookies()).get("numelixa_device_token")?.value||"").trim();
  const devices=await collection<any>("deviceTokens");
  const row=token?await devices.findOne({token}):null;
  const userId=user?String(user.id):"";
  const linked=userId
    ? await devices.countDocuments({userId,platform:"android"})
    : 0;
  return NextResponse.json({
   ok:true,
   firebaseServerConfigured:isFirebaseConfigured(),
   browserOrAppSession:Boolean(user),
   deviceCookie:Boolean(token),
   deviceRegistered:Boolean(row),
   deviceLinked:Boolean(row&&userId&&String(row.userId||"")===userId),
   platform:String(row?.platform||""),
   registeredAt:row?.createdAt||null,
   lastSeenAt:row?.updatedAt||null,
   linkedDeviceCount:linked
  },{headers:{"Cache-Control":"no-store"}});
 }catch{
  return NextResponse.json({ok:false,error:"Unable to read notification diagnostics."},{status:500});
 }
}
