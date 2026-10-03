import {NextResponse} from "next/server";
import {listServices,providerConfigured,APP_SERVICES} from "@/lib/smspool";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function GET(req:Request){
  try{
    if(!providerConfigured())return NextResponse.json({ok:true,live:false,services:APP_SERVICES});
    const country=new URL(req.url).searchParams.get("country")||undefined;
    const services=await listServices(country);
    return NextResponse.json({ok:true,services,live:true});
  }catch{
    return NextResponse.json({ok:true,live:false,services:APP_SERVICES});
  }
}
