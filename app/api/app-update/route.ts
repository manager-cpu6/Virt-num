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
  // A release is only eligible for accounts that already existed when
  // that release was published. This prevents a newly-created account or a
  // fresh install for a brand-new account from being asked to install an
  // update that was published before the account existed.
  const userCreatedAt=new Date(user.createdAt||0).getTime();
  const publishedAt=new Date(latest.publishedAt||0).getTime();
  const targetCreatedBefore=latest.targetCreatedBefore
    ? new Date(latest.targetCreatedBefore).getTime()
    : publishedAt;
  const eligible=userCreatedAt>0 && publishedAt>0 &&
    userCreatedAt<=targetCreatedBefore;
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
