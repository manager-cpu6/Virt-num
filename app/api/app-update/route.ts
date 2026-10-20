import {NextResponse} from "next/server";
import {collection} from "@/lib/mongo";

export const runtime="nodejs";
export const dynamic="force-dynamic";

const CURRENT_VERSION="1.0.2";
const CURRENT_VERSION_CODE=3;
const CURRENT_SIZE_BYTES=55988681;
const CURRENT_RELEASE_NOTES="Numelixa Android 1.0.2: improved app update flow, launcher icon assets, and Android installer handoff.";
const CURRENT_APK_URL="https://github.com/manager-cpu6/Numelixa-app/releases/download/android-latest/app-release.apk";

function compareVersions(left:string,right:string){
  const normalize=(value:string)=>value.split("+")[0].split("-")[0].split(".").map(part=>Number.parseInt(part,10)||0);
  const a=normalize(left),b=normalize(right);
  for(let i=0;i<Math.max(a.length,b.length);i++){
    const diff=(a[i]||0)-(b[i]||0);
    if(diff!==0)return diff;
  }
  return 0;
}

export async function GET(){
  try{
    const latest=await (await collection<any>("appUpdates"))
      .findOne({published:true},{sort:{publishedAt:-1}});
    const version=String(latest?.version||"").trim();
    if(latest&&version&&compareVersions(version,CURRENT_VERSION)>0){
      return NextResponse.json({
        ok:true,
        update:{
          version,
          versionCode:Number(latest.versionCode||0),
          sizeMb:Number(latest.sizeMb||0),
          sizeBytes:Number(latest.sizeBytes||0),
          apkUrl:String(latest.apkUrl||CURRENT_APK_URL),
          releaseNotes:String(latest.releaseNotes||""),
          force:Boolean(latest.force),
          publishedAt:latest.publishedAt||null
        }
      },{headers:{"Cache-Control":"no-store"}});
    }
    return NextResponse.json({
      ok:true,
      update:{
        version:CURRENT_VERSION,
        versionCode:CURRENT_VERSION_CODE,
        sizeMb:Number((CURRENT_SIZE_BYTES/(1024*1024)).toFixed(2)),
        sizeBytes:CURRENT_SIZE_BYTES,
        apkUrl:CURRENT_APK_URL,
        releaseNotes:CURRENT_RELEASE_NOTES,
        force:false,
        publishedAt:"2026-10-20T00:00:00.000Z"
      }
    },{headers:{"Cache-Control":"no-store"}});
  }catch(error){
    console.error("[APP UPDATE]",error);
    return NextResponse.json({ok:false,update:null},{status:200,headers:{"Cache-Control":"no-store"}});
  }
}
