import {NextResponse} from "next/server";
import {collection} from "@/lib/mongo";
import {getUser} from "@/lib/auth";

export const runtime="nodejs";
export const dynamic="force-dynamic";

export async function GET(){
 try{
  const user=await getUser();
  const latest=await (await collection<any>("appUpdates"))
   .findOne({published:true},{sort:{publishedAt:-1}});
  if(!user || !latest){
   return NextResponse.json({ok:true,update:null},{headers:{"Cache-Control":"no-store"}});
  }
  const userCreatedAt=new Date(user.createdAt||0).getTime();
  const releaseTargetAt=new Date(latest.targetCreatedBefore||latest.publishedAt||0).getTime();
  const eligible=userCreatedAt>0 && releaseTargetAt>0 && userCreatedAt<=releaseTargetAt;
  return NextResponse.json({
   ok:true,
   update:eligible?{
    id:String(latest.releaseId||latest._id||""),
    version:String(latest.version||""),
    versionCode:Number(latest.versionCode||0),
    sizeMb:Number(latest.sizeMb||0),
    sizeBytes:Number(latest.sizeBytes||0),
    installRequired:Boolean(latest.installRequired||latest.force),
    apkUrl:String(latest.apkUrl||""),
    releaseNotes:String(latest.releaseNotes||""),
    force:Boolean(latest.force) && user!==null &&
      (!latest.targetCreatedBefore ||
       new Date(user.createdAt||0).getTime()<=new Date(latest.targetCreatedBefore).getTime()),
    publishedAt:latest.publishedAt||null
   }:null
  },{headers:{"Cache-Control":"no-store"}});
 }catch(error){
  console.error("[APP UPDATE]",error);
  return NextResponse.json({ok:false,update:null},{status:200,headers:{"Cache-Control":"no-store"}});
 }
}
