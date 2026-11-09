import {NextResponse} from "next/server";

export const runtime="nodejs";
export const dynamic="force-dynamic";

// Canonicalize the download host first. Once on www.numelixa.com, internally
// rewrite to /android so the browser never follows the GitHub release redirect.
const CANONICAL="https://www.numelixa.com";

function downloadResponse(request:Request){
  const incoming=new URL(request.url);
  if(incoming.hostname.toLowerCase()!=="www.numelixa.com"){
    return NextResponse.redirect(new URL("/api/mobile/apk",CANONICAL),302);
  }
  return NextResponse.rewrite(new URL("/android",CANONICAL));
}

export async function GET(request:Request){
  return downloadResponse(request);
}

export async function HEAD(request:Request){
  return downloadResponse(request);
}
