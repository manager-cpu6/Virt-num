import {NextResponse} from "next/server";
import {collection} from "@/lib/mongo";

export const runtime="nodejs";
export const dynamic="force-dynamic";
export const maxDuration=300;

async function getSource(){
  const latest=await (await collection<any>("appUpdates")).findOne(
    {published:true},
    {sort:{publishedAt:-1},projection:{sourceApkUrl:1}}
  );
  const source=String(latest?.sourceApkUrl||"").trim();
  if(!source) return null;
  try{
    const url=new URL(source);
    const allowed=new Set([
      "github.com","www.github.com",
      "objects.githubusercontent.com","release-assets.githubusercontent.com",
      "raw.githubusercontent.com","githubusercontent.com"
    ]);
    if(url.protocol!=="https:"||!allowed.has(url.hostname.toLowerCase())) return null;
    return url;
  }catch{return null;}
}

export async function HEAD(){
  try{
    const source=await getSource();
    if(!source) return new NextResponse("APK is not published yet.",{status:404});
    const upstream=await fetch(source,{method:"HEAD",redirect:"follow",cache:"no-store"});
    const headers=new Headers();
    for(const name of ["content-length","content-type","accept-ranges","etag","last-modified"]){
      const value=upstream.headers.get(name);
      if(value) headers.set(name,value);
    }
    headers.set("Cache-Control","no-store");
    return new NextResponse(null,{status:upstream.status,headers});
  }catch(error){
    console.error("[APK HEAD]",error);
    return new NextResponse("APK is temporarily unavailable.",{status:503});
  }
}

export async function GET(req:Request){
  try{
    const source=await getSource();
    if(!source) return new NextResponse("APK is not published yet.",{status:404});

    const range=req.headers.get("range");
    const headers=new Headers();
    if(range) headers.set("Range",range);
    const upstream=await fetch(source,{
      method:"GET",
      headers,
      redirect:"follow",
      cache:"no-store"
    });

    const responseHeaders=new Headers();
    for(const name of ["content-length","content-type","content-range","accept-ranges","etag","last-modified"]){
      const value=upstream.headers.get(name);
      if(value) responseHeaders.set(name,value);
    }
    responseHeaders.set("Content-Disposition","attachment; filename="Numelixa.apk"");
    responseHeaders.set("Cache-Control","no-store, no-cache, must-revalidate");
    responseHeaders.set("X-Content-Type-Options","nosniff");

    return new Response(upstream.body,{
      status:upstream.status,
      headers:responseHeaders
    });
  }catch(error){
    console.error("[APK GET]",error);
    return new NextResponse("APK is temporarily unavailable.",{status:503});
  }
}
