import {NextRequest,NextResponse} from "next/server";

export function middleware(request:NextRequest){
  const host=(request.headers.get("host")||"").split(":")[0].toLowerCase();
  const path=request.nextUrl.pathname;
  if(path.startsWith("/_next")||path.startsWith("/api")||path==="/favicon.ico"||path==="/robots.txt"||path==="/sitemap.xml")return NextResponse.next();
  let prefix="";
  if(host==="developer.numelixa.com")prefix="/developers";
  else if(host==="docs.numelixa.com")prefix="/developers/docs";
  else if(host==="support.numelixa.com")prefix="/support";
  if(!prefix)return NextResponse.next();
  const url=request.nextUrl.clone();
  url.pathname=path==="/" ? prefix : prefix+path;
  return NextResponse.rewrite(url);
}

export const config={matcher:["/((?!_next/static|_next/image|favicon.ico).*)"]};
