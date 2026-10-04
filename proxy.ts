import {NextRequest,NextResponse} from "next/server";

const PUBLIC_HOSTS=new Set(["developers.numelixa.com","docs.numelixa.com"]);
const API_PREFIX="/api/v1";
const corsHeaders={
  "Access-Control-Allow-Origin":"*",
  "Access-Control-Allow-Methods":"GET,POST,DELETE,OPTIONS",
  "Access-Control-Allow-Headers":"Authorization,Content-Type,X-API-Key",
  "Access-Control-Max-Age":"86400",
};

export function proxy(req:NextRequest){
  const host=(req.headers.get("host")||"").split(":")[0].toLowerCase();
  const pathname=req.nextUrl.pathname;

  if(pathname===API_PREFIX||pathname.startsWith(API_PREFIX+"/")){
    if(req.method==="OPTIONS") return new NextResponse(null,{status:204,headers:corsHeaders});
    const res=NextResponse.next();
    for(const [k,v] of Object.entries(corsHeaders))res.headers.set(k,v);
    return res;
  }

  if(host==="api.numelixa.com"){
    const url=req.nextUrl.clone();
    if(pathname==="/"||pathname==="") url.pathname="/api/v1";
    else if(pathname==="/v1"||pathname.startsWith("/v1/")) url.pathname="/api"+pathname;
    return NextResponse.rewrite(url);
  }

  if(PUBLIC_HOSTS.has(host)){
    if(pathname==="/"||pathname===""){
      const url=req.nextUrl.clone();
      url.pathname="/developers";
      return NextResponse.rewrite(url);
    }
    if(pathname==="/docs"||pathname.startsWith("/docs/")){
      const url=req.nextUrl.clone();
      url.pathname="/developers/docs"+pathname.slice(5);
      return NextResponse.rewrite(url);
    }
  }

  if(host==="privacy.numelixa.com"&&pathname==="/"){
    const url=req.nextUrl.clone();
    url.pathname="/privacy";
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

export const config={
  matcher:["/((?!_next/static|_next/image|favicon.ico).*)"],
};
