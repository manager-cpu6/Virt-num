import {NextResponse} from "next/server";
import {collection} from "@/lib/mongo";

export const runtime="nodejs";
export const dynamic="force-dynamic";

const CURRENT_VERSION="1.0.7+8";
const CURRENT_VERSION_CODE=8;
const CURRENT_SIZE_BYTES=0;
const CURRENT_RELEASE_NOTES="Help Team Chat is now available in Account. This release improves automatic update discovery and removes the redundant Notifications shortcut from Home. Push notifications remain enabled.";
const CURRENT_APK_URL="https://github.com/manager-cpu6/Numelixa-app/releases/download/android-latest/Numelixa.apk";

function cleanReleaseNotes(raw:unknown){
  const text=String(raw||"")
    .replace(/\*\*Full Changelog\*\*:?[^\n]*/gi,"")
    .replace(/Full Changelog:?[^\n]*/gi,"")
    .replace(/https?:\/\/\S+/gi,"")
    .replace(/github\.com\/[^\s]*/gi,"");
  const seen=new Set<string>();
  const lines:string[]=[];
  for(let line of text.split(/\r?\n/)){
    line=line.replace(/^\s*[-*•>]+\s*/,"").replace(/[\x60*_]{1,3}/g,"").replace(/\s+/g," ").trim();
    const lower=line.toLowerCase();
    if(line.length<8||lower.includes("full changelog")||lower.includes("commits/android-latest")||lower.includes("github.com/manager-cpu6")||["yo","infc","una","hom"].includes(lower))continue;
    const key=lower.replace(/[^a-z0-9]+/g," ").trim();
    if(!key||seen.has(key))continue;
    seen.add(key);lines.push(line);if(lines.length===4)break;
  }
  return lines.join("\n")||"A cleaner update experience, improved download progress, and stability improvements.";
}

function compareVersions(left:string,right:string){
  // Compare the Android build number after "+" too: 1.0.7+9 must be newer
  // than 1.0.7+8, otherwise existing installs never see build-only updates.
  const normalize=(value:string)=>{
    const [release,buildText]=value.trim().split("+",2);
    const core=release.split("-")[0].split(".").map(part=>Number.parseInt(part,10)||0);
    const build=Number.parseInt(buildText||"0",10)||0;
    return {core,build};
  };
  const a=normalize(left),b=normalize(right);
  for(let i=0;i<Math.max(a.core.length,b.core.length);i++){
    const diff=(a.core[i]||0)-(b.core[i]||0);
    if(diff!==0)return diff;
  }
  return a.build-b.build;
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
          releaseNotes:cleanReleaseNotes(latest.releaseNotes),
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
