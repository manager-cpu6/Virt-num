import {NextRequest,NextResponse} from "next/server";

export function proxy(req:NextRequest){
  const host=(req.headers.get("host")||"").split(":")[0].toLowerCase();
  const pathname=req.nextUrl.pathname;

  if(host==="docs.numelixa.com"&&pathname==="/"){
    const url=req.nextUrl.clone();
    url.pathname="/docs";
    return NextResponse.rewrite(url);
  }

  if(host==="privacy.numelixa.com"&&pathname==="/"){
    const url=request.nextUrl.clone();
    url.pathname="/privacy";
    return NextResponse.rewrite(url);
  }

  return NextResponse.next();
}

export const config={
  matcher:["/((?!_next/static|_next/image|favicon.ico).*)"],
};