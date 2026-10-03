import {NextResponse} from "next/server";
import {stock,providerConfigured} from "@/lib/smspool";
import {getSettings,sellCoins} from "@/lib/settings";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function GET(req:Request){
  try{
    if(!providerConfigured())return NextResponse.json({ok:false},{status:503});
    const u=new URL(req.url),country=u.searchParams.get("country")||"",service=u.searchParams.get("service")||"";
    if(!country||!service)return NextResponse.json({ok:false},{status:400});
    const q=await stock(country,service),settings=await getSettings();
    return NextResponse.json({ok:true,stock:{...q,providerCost:q.cost,sellCoins:sellCoins(q.cost,settings),currency:"USD",markupPercent:settings.markupPercent}});
  }catch{
    return NextResponse.json({ok:false},{status:502});
  }
}
