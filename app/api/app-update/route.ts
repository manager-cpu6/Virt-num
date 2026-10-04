import {NextResponse} from "next/server";
import {collection} from "@/lib/mongo";

export const runtime="nodejs";
export const dynamic="force-dynamic";

export async function GET(){
  try{
    const latest=await (await collection<any>("appUpdates"))
      .findOne({published:true},{sort:{publishedAt:-1}});
    return NextResponse.json({
      ok:true,
      update:latest?{
        version:String(latest.version||""),
        versionCode:Number(latest.versionCode||0),
        sizeMb:Number(latest.sizeMb||0),
        apkUrl:String(latest.apkUrl||""),
        releaseNotes:String(latest.releaseNotes||""),
        force:Boolean(latest.force),
        publishedAt:latest.publishedAt||null
      }:null
    },{headers:{"Cache-Control":"no-store"}});
  }catch(error){
    console.error("[APP UPDATE]",error);
    return NextResponse.json({ok:false,update:null},{status:200,headers:{"Cache-Control":"no-store"}});
  }
}
