import {NextRequest, NextResponse} from "next/server";

const PUBLIC_HOSTS=new Set(["developers.numelixa.com"]);

export function middleware(req:NextRequest){
  const host=(req.headers.get("host")||"").split(":")[0].toLowerCase();
  const pathname=req.nextUrl.pathname;

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
  return NextResponse.next();
}

export const config={matcher:["/((?!_next/static|_next/image|favicon.ico).*)"]};
