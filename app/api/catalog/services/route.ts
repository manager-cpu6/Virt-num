import {NextResponse} from "next/server";
import {listServices,providerConfigured} from "@/lib/fivesim";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function GET(){
  try{
    if(!providerConfigured())return NextResponse.json({ok:false,live:false,services:[],error:"SMS provider is not configured."},{status:503});
    const services=await listServices();
    return NextResponse.json({ok:true,live:true,count:services.length,services});
  }catch(e){
    return NextResponse.json({ok:false,live:false,services:[],error:"Unable to load live services."},{status:502});
  }
}