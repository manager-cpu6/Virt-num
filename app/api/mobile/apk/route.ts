import {NextResponse} from "next/server";

export const runtime="nodejs";
export const dynamic="force-dynamic";

const CANONICAL="https://www.numelixa.com";
const INTERNAL_APK=new URL("/android",CANONICAL);

function canonicalRedirect(request:Request){
  const incoming=new URL(request.url);
  return incoming.hostname.toLowerCase()==="www.numelixa.com"
    ? null
    : NextResponse.redirect(new URL("/api/mobile/apk",CANONICAL),302);
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
  headers.set("Cache-Control","no-store, no-cache, must-revalidate");
  headers.set("X-Content-Type-Options","nosniff");
  return headers;
}

export async function GET(request:Request){
  const redirect=canonicalRedirect(request);
  if(redirect)return redirect;
  try{
    const headers=new Headers();
    const range=request.headers.get("range");
    if(range)headers.set("Range",range);
    const upstream=await fetch(INTERNAL_APK,{method:"GET",headers,redirect:"manual",cache:"no-store"});
    if(!isValidApkResponse(upstream)){
      try{await upstream.body?.cancel()}catch{}
      return new NextResponse("The official Numelixa APK is temporarily unavailable.",{status:502});
    }
    return new Response(upstream.body,{status:upstream.status,headers:copyDownloadHeaders(upstream)});
  }catch(error){
    console.error("[APK DOMAIN PROXY]",error);
    return new NextResponse("APK is temporarily unavailable.",{status:503});
  }
}

export async function HEAD(request:Request){
  const redirect=canonicalRedirect(request);
  if(redirect)return redirect;
  try{
    const upstream=await fetch(INTERNAL_APK,{method:"HEAD",redirect:"manual",cache:"no-store"});
    if(!isValidApkResponse(upstream))return new NextResponse("The official Numelixa APK is temporarily unavailable.",{status:502});
    return new NextResponse(null,{status:upstream.status,headers:copyDownloadHeaders(upstream)});
  }catch(error){
    console.error("[APK DOMAIN PROXY HEAD]",error);
    return new NextResponse("APK is temporarily unavailable.",{status:503});
  }
}
