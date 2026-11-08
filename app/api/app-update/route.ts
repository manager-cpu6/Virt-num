import {NextResponse} from "next/server";
import {collection} from "@/lib/mongo";

export const runtime="nodejs";
export const dynamic="force-dynamic";

const FALLBACK_RELEASE={
  version:"1.0.11+12",
  versionCode:12,
  sizeBytes:58396063,
  apkUrl:"https://github.com/manager-cpu6/Numelixa-app/releases/download/android-latest/Numelixa.apk",
  sha256:"",
  releaseNotes:"Premium mobile experience with smoother navigation, improved reliability, and updated support features. Existing accounts and data are preserved during the update.",
  publishedAt:"2026-11-08T00:00:00.000Z"
};
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

async function getRollingRelease(){
  try{
    const response=await fetch("https://api.github.com/repos/manager-cpu6/Numelixa-app/releases/tags/android-latest",{
      headers:{Accept:"application/vnd.github+json"},
      next:{revalidate:300}
    });
    if(!response.ok)return null;
    const release=await response.json();
    if(release.draft||release.prerelease)return null;
    const name=String(release.name||release.tag_name||"").trim();
    const versionMatch=name.match(/(\d+\.\d+\.\d+\+\d+)/);
    const version=versionMatch?.[1]||"";
    const versionCode=Number(version.match(/\+(\d+)$/)?.[1]||0);
    const assets=Array.isArray(release.assets)?release.assets:[];
    const apk=assets.find((asset:any)=>String(asset.name||"").toLowerCase()==="numelixa.apk")
      ||assets.find((asset:any)=>String(asset.name||"").toLowerCase().endsWith(".apk"));
    const apkUrl=String(apk?.browser_download_url||"");
    const sizeBytes=Number(apk?.size||0);
    if(!version||!versionCode||!apkUrl.startsWith("https://")||!sizeBytes)return null;
    const digest=String(apk?.digest||"");
    const sha256=digest.startsWith("sha256:")?digest.slice(7).toLowerCase():"";
    return {
      version,versionCode,sizeBytes,
      sizeMb:Number((sizeBytes/(1024*1024)).toFixed(2)),
      sha256,apkUrl,
      releaseNotes:cleanReleaseNotes(release.body),
      publishedAt:release.published_at||null
    };
  }catch{
    return null;
  }
}

export async function GET(){
  try{
    const [latest,rollingRelease]=await Promise.all([
      (await collection<any>("appUpdates")).findOne({published:true},{sort:{publishedAt:-1}}),
      getRollingRelease()
    ]);
    const current=rollingRelease||{
      ...FALLBACK_RELEASE,
      sizeMb:Number((FALLBACK_RELEASE.sizeBytes/(1024*1024)).toFixed(2))
    };
    const version=String(latest?.version||"").trim();
    if(latest&&version&&compareVersions(version,current.version)>0){
      return NextResponse.json({
        ok:true,
        update:{
          version,
          versionCode:Number(latest.versionCode||Number(version.match(/\\+(\\d+)$/)?.[1]||0)),
          sizeMb:Number(latest.sizeMb||0),
          sizeBytes:Number(latest.sizeBytes||0),
          sha256:String(latest.sha256||""),
          apkUrl:String(latest.apkUrl||current.apkUrl),
          releaseNotes:cleanReleaseNotes(latest.releaseNotes),
          force:Boolean(latest.force),
          publishedAt:latest.publishedAt||null
        }
      },{headers:{"Cache-Control":"no-store"}});
    }
    return NextResponse.json({ok:true,update:current},{headers:{"Cache-Control":"no-store"}});
  }catch(error){
    console.error("[APP UPDATE]",error);
    return NextResponse.json({ok:false,update:null},{status:200,headers:{"Cache-Control":"no-store"}});
  }
}
