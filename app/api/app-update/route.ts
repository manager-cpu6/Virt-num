import {NextResponse} from "next/server";
import {collection} from "@/lib/mongo";

export const runtime="nodejs";
export const dynamic="force-dynamic";

const FALLBACK_RELEASE={
  version:"1.0.15+16",
  versionCode:16,
  sizeBytes:58759103,
  apkUrl:"https://www.numelixa.com/api/mobile/apk",
  sha256:"18072f1da303d38bf30e0e4dadbdd385065daa8fa5e176d9fb34a32755f001b0",
  releaseNotes:"Premium mobile experience with smoother navigation, improved reliability, and updated support features. Existing accounts and data are preserved during the update.",
  publishedAt:"2026-11-10T13:55:01.000Z"
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
      cache:"no-store"
    });
    if(!response.ok)return null;
    const release=await response.json();
    if(release.draft||release.prerelease)return null;
    // The rolling GitHub release's title/body are updated by the same CI job
    // that uploads Numelixa.apk. The lightweight tag itself can remain old
    // when an existing release has its asset replaced, so never read pubspec
    // from that stale tag or from unbuilt main-branch source.
    const titleVersion=String(release.name||"").match(/([0-9]+\\.[0-9]+\\.[0-9]+\\+[0-9]+)/)?.[1]||"";
    const bodyVersion=String(release.body||"").match(/\\bVersion\\s+([0-9]+\\.[0-9]+\\.[0-9]+\\+[0-9]+)/i)?.[1]||"";
    const version=titleVersion||bodyVersion;
    if(!version||(titleVersion&&bodyVersion&&titleVersion!==bodyVersion))return null;
    const versionCode=Number(version.match(/\\+(\\d+)$/)?.[1]||0);
    const assets=Array.isArray(release.assets)?release.assets:[];
    const apk=assets.find((asset:any)=>String(asset.name||"").toLowerCase()==="numelixa.apk");
    const apkUrl=String(apk?.browser_download_url||"");
    const sizeBytes=Number(apk?.size||0);
    if(!version||!versionCode||!apkUrl.startsWith("https://github.com/manager-cpu6/Numelixa-app/releases/download/")||sizeBytes<20*1024*1024)return null;
    const digest=String(apk?.digest||"");
    const sha256=digest.startsWith("sha256:")?digest.slice(7).toLowerCase():"";
    return {
      version,versionCode,sizeBytes,
      sizeMb:Number((sizeBytes/(1024*1024)).toFixed(2)),
      sha256,apkUrl:"https://www.numelixa.com/api/mobile/apk",
      releaseNotes:"Numelixa "+version+" — latest Android release with refreshed mobile experience and reliability improvements.",
      publishedAt:apk.updated_at||release.published_at||null
    };
  }catch{
    return null;
  }
}

export async function GET(req:Request){
  try{
    // Build 16 is the minimum supported native app. Older installations
    // (including 1.0.1-era builds) must install the current APK before access
    // policy is evaluated by newer clients.
    const clientVersionCode=Number(new URL(req.url).searchParams.get("versionCode")||0);
    const requiresUpgrade=clientVersionCode<16;
    const [latest,rollingRelease]=await Promise.all([
      (await collection<any>("appUpdates")).findOne({published:true},{sort:{publishedAt:-1}}),
      getRollingRelease()
    ]);
    const current=rollingRelease||{
      ...FALLBACK_RELEASE,
      sizeMb:Number((FALLBACK_RELEASE.sizeBytes/(1024*1024)).toFixed(2))
    };
    const version=String(latest?.version||"").trim();
    if(latest&&version&&Number(latest.sizeBytes||0)>=20*1024*1024&&compareVersions(version,current.version)>0){
      return NextResponse.json({
        ok:true,
        update:{
          version,
          versionCode:Number(latest.versionCode||Number(version.match(/\+(\d+)$/)?.[1]||0)),
          sizeMb:Number(latest.sizeMb||0),
          sizeBytes:Number(latest.sizeBytes||0),
          sha256:String(latest.sha256||""),
          apkUrl:"https://www.numelixa.com/api/mobile/apk",
          releaseNotes:cleanReleaseNotes(latest.releaseNotes),
          force:Boolean(latest.force)||requiresUpgrade,
          publishedAt:latest.publishedAt||null
        }
      },{headers:{"Cache-Control":"no-store"}});
    }
    // Keep the admin's mandatory-update policy attached to the live release
    // even when both records have the same version. This lets legacy installs
    // be forced forward without publishing a fake higher version.
    if(latest&&version&&Number(latest.sizeBytes||0)>=20*1024*1024&&compareVersions(version,current.version)===0){
      return NextResponse.json({
        ok:true,
        update:{
          ...current,
          force:Boolean(latest.force)||requiresUpgrade,
          releaseNotes:cleanReleaseNotes(latest.releaseNotes)||current.releaseNotes,
          publishedAt:latest.publishedAt||current.publishedAt||null
        }
      },{headers:{"Cache-Control":"no-store"}});
    }
    return NextResponse.json({
      ok:true,
      update:{...current,force:requiresUpgrade}
    },{headers:{"Cache-Control":"no-store"}});
  }catch(error){
    console.error("[APP UPDATE]",error);
    return NextResponse.json({ok:false,update:null},{status:200,headers:{"Cache-Control":"no-store"}});
  }
}
