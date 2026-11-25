import {NextResponse} from "next/server";
import {collection} from "@/lib/mongo";
import crypto from "crypto";
import {requireUser} from "@/lib/auth";

export const runtime="nodejs";
export const dynamic="force-dynamic";

function cleanHost(value:unknown){
  const raw=String(value||"").trim().toLowerCase().slice(0,180);
  if(!raw)return "";
  try{
    const host=new URL(raw.includes("://")?raw:"https://"+raw).hostname.toLowerCase();
    return host.replace(/^www\./,"").slice(0,120);
  }catch{return "";}
}
function cleanLocation(value:unknown,max=100){
  const raw=String(value||"").trim().replace(/[\r\n\t]/g," ").slice(0,max);
  if(!raw)return "";
  try{return decodeURIComponent(raw).replace(/[<>]/g,"").trim().slice(0,max)}catch{return raw.replace(/[<>]/g,"").slice(0,max)}
}
function countryName(code:string){
  if(!/^[A-Z]{2}$/.test(code))return "";
  try{return new Intl.DisplayNames(["en"],{type:"region"}).of(code)||code}catch{return code}
}
export async function POST(req:Request){
  try{
    const body=await req.json();
    const event=body?.event==="click"?"click":body?.event==="pageview"?"pageview":"";
    const visitorId=String(body?.visitorId||"").trim();
    const path=String(body?.path||"/").slice(0,240);
    const label=String(body?.label||"").replace(/[\r\n\t]/g," ").slice(0,80);
    const campaignSource=String(body?.campaignSource||"").trim().toLowerCase().replace(/[^a-z0-9._-]/g,"").slice(0,120);
    const referrerHost=cleanHost(body?.referrerHost);
    const source=campaignSource||cleanHost(body?.source)||referrerHost||"direct";
    let stableVisitorId=visitorId,authenticatedVisitor=false;
    try{const user=await requireUser();stableVisitorId="acct-"+crypto.createHash("sha256").update(String(user.id)).digest("hex").slice(0,32);authenticatedVisitor=true}catch{}
    const countryCode=cleanLocation(req.headers.get("x-vercel-ip-country"),2).toUpperCase();
    const country=countryName(countryCode);
    const city=cleanLocation(req.headers.get("x-vercel-ip-city"),80);
    const region=cleanLocation(req.headers.get("x-vercel-ip-country-region"),80);
    if(!event||!/^[a-zA-Z0-9-]{12,64}$/.test(visitorId)||!path.startsWith("/")||path.startsWith("/api/")){
      return NextResponse.json({ok:false},{status:400});
    }
    await (await collection<any>("analyticsEvents")).insertOne({
      event,visitorId:stableVisitorId,authenticatedVisitor,path,label,source,referrerHost,campaignSource:campaignSource||null,
      countryCode,country:country||"Unknown",city:city||"Unknown",region:region||null,
      createdAt:new Date()
    });
    return NextResponse.json({ok:true},{headers:{"Cache-Control":"no-store"}});
  }catch{
    return NextResponse.json({ok:false},{status:400});
  }
}
