import {NextResponse} from "next/server";

export const runtime="nodejs";
export const dynamic="force-dynamic";
export const revalidate=0;

const RELEASE_API="https://api.github.com/repos/manager-cpu6/Numelixa-app/releases/tags/android-latest";

async function latestApkUrl(){
  const response=await fetch(RELEASE_API,{
    headers:{Accept:"application/vnd.github+json","X-GitHub-Api-Version":"2022-11-28"},
    cache:"no-store"
  });
  if(!response.ok)throw new Error("Unable to read the official Numelixa Android release.");
  const release=await response.json();
  if(release.draft||release.prerelease)throw new Error("The latest Android release is not public.");
  const apk=(Array.isArray(release.assets)?release.assets:[]).find((asset:any)=>
    String(asset.name||"").toLowerCase()==="numelixa.apk"
  );
  if(!apk||Number(apk.size)<20*1024*1024)throw new Error("The latest official APK asset is missing or invalid.");
  const url=String(apk.browser_download_url||"");
  if(!url.startsWith("https://github.com/manager-cpu6/Numelixa-app/releases/download/"))
    throw new Error("The APK download URL is not an official Numelixa release asset.");
  return url;
}

function isValidApkResponse(response:Response){
  if(response.status!==200&&response.status!==206)return false;
  const range=response.headers.get("content-range")||"";
  const match=range.match(/\/(\d+)$/);
  const total=Number(match?.[1]||response.headers.get("content-length")||0);
  const type=(response.headers.get("content-type")||"").toLowerCase();
  return total>=20*1024*1024&&!type.includes("text/html");
}

function copyDownloadHeaders(upstream:Response){
  const headers=new Headers();
  for(const name of ["content-length","content-type","content-range","accept-ranges","etag","last-modified"]){
    const value=upstream.headers.get(name);
    if(value)headers.set(name,value);
  }
  headers.set("Content-Type","application/vnd.android.package-archive");
  headers.set("Content-Disposition",'attachment; filename="Numelixa.apk"');
  headers.set("Cache-Control","no-store, no-cache, must-revalidate, proxy-revalidate");
  headers.set("Pragma","no-cache");
  headers.set("Expires","0");
  headers.set("X-Content-Type-Options","nosniff");
  headers.set("X-Numelixa-APK-Source","official-github-latest");
  return headers;
}

async function proxyApk(request:Request,method:"GET"|"HEAD"){
  try{
    const url=await latestApkUrl();
    const headers=new Headers();
    const range=request.headers.get("range");
    if(range)headers.set("Range",range);
    const upstream=await fetch(url,{method,headers,redirect:"follow",cache:"no-store"});
    if(!isValidApkResponse(upstream)){
      try{await upstream.body?.cancel()}catch{}
      return new NextResponse("The latest official Numelixa APK is temporarily unavailable.",{status:502});
    }
    return new Response(method==="HEAD"?null:upstream.body,{status:upstream.status,headers:copyDownloadHeaders(upstream)});
  }catch(error){
    console.error("[APK LATEST RELEASE PROXY]",error);
    return new NextResponse("The latest official Numelixa APK is temporarily unavailable.",{status:503,headers:{"Cache-Control":"no-store"}});
  }
}

export async function GET(request:Request){return proxyApk(request,"GET");}
export async function HEAD(request:Request){return proxyApk(request,"HEAD");}
