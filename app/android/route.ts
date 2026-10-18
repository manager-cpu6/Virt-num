import {NextResponse} from "next/server";
import {collection} from "@/lib/mongo";

export const runtime="nodejs";
export const dynamic="force-dynamic";
export const maxDuration=300;

const CURRENT_VERSION="1.0.1";
const CURRENT_RELEASE_APK="https://github.com/manager-cpu6/Numelixa-app/releases/download/android-latest/app-release.apk";
const ALLOWED_HOSTS=new Set([
  "github.com","www.github.com",
  "objects.githubusercontent.com","release-assets.githubusercontent.com",
  "raw.githubusercontent.com","githubusercontent.com"
]);

function compareVersions(left:string,right:string){
  const normalize=(value:string)=>value.split("+")[0].split("-")[0].split(".").map(part=>Number.parseInt(part,10)||0);
  const a=normalize(left),b=normalize(right);
  for(let i=0;i<Math.max(a.length,b.length);i++){
    const diff=(a[i]||0)-(b[i]||0);
    if(diff!==0)return diff;
  }
  return 0;
}

function safeSource(value:string){
  try{
    const url=new URL(value);
    return url.protocol==="https:"&&ALLOWED_HOSTS.has(url.hostname.toLowerCase())?url:null;
  }catch{return null;}
}

async function getSource(){
  const latest=await (await collection<any>("appUpdates")).findOne(
    {published:true},
    {sort:{publishedAt:-1},projection:{version:1,apkUrl:1,sourceApkUrl:1}}
  );
  const version=String(latest?.version||"").trim();
  // Ignore the old Virt-num APK that was previously served from this domain.
  // A newer, explicitly published app-update can still override this release.
  if(version&&compareVersions(version,CURRENT_VERSION)>0){
    const custom=safeSource(String(latest?.sourceApkUrl||latest?.apkUrl||"").trim());
    if(custom)return custom;
  }
  return new URL(CURRENT_RELEASE_APK);
}

export async function HEAD(){
  try{
    const source=await getSource();
    const upstream=await fetch(source,{method:"HEAD",redirect:"follow",cache:"no-store"});
    const headers=new Headers();
    for(const name of ["content-length","content-type","accept-ranges","etag","last-modified"]){
      const value=upstream.headers.get(name);
      if(value)headers.set(name,value);
    }
    headers.set("Cache-Control","no-store");
    headers.set("Content-Disposition",'attachment; filename="Numelixa.apk"');
    return new NextResponse(null,{status:upstream.status,headers});
  }catch(error){
    console.error("[APK HEAD]",error);
    return new NextResponse("APK is temporarily unavailable.",{status:503});
  }
}

export async function GET(req:Request){
  try{
    const source=await getSource();
    const range=req.headers.get("range");
    const headers=new Headers();
    if(range)headers.set("Range",range);
    const upstream=await fetch(source,{method:"GET",headers,redirect:"follow",cache:"no-store"});
    const responseHeaders=new Headers();
    for(const name of ["content-length","content-type","content-range","accept-ranges","etag","last-modified"]){
      const value=upstream.headers.get(name);
      if(value)responseHeaders.set(name,value);
    }
    responseHeaders.set("Content-Disposition",'attachment; filename="Numelixa.apk"');
    responseHeaders.set("Cache-Control","no-store, no-cache, must-revalidate");
    responseHeaders.set("X-Content-Type-Options","nosniff");
    return new Response(upstream.body,{status:upstream.status,headers:responseHeaders});
  }catch(error){
    console.error("[APK GET]",error);
    return new NextResponse("APK is temporarily unavailable.",{status:503});
  }
}
