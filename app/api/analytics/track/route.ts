import {NextResponse} from "next/server";
import {collection} from "@/lib/mongo";

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
    if(!event||!/^[a-zA-Z0-9-]{12,64}$/.test(visitorId)||!path.startsWith("/")||path.startsWith("/api/")){
      return NextResponse.json({ok:false},{status:400});
    }
    await (await collection<any>("analyticsEvents")).insertOne({
      event,visitorId,path,label,source,referrerHost,campaignSource:campaignSource||null,createdAt:new Date()
    });
    return NextResponse.json({ok:true},{headers:{"Cache-Control":"no-store"}});
  }catch{
    return NextResponse.json({ok:false},{status:400});
  }
}
