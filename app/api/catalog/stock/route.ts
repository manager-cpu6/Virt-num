import {NextResponse} from "next/server";
import {stock,providerConfigured} from "@/lib/sms-provider";
import {getSettings,sellCoins} from "@/lib/settings";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function GET(req:Request){
  try{
    if(!providerConfigured())return NextResponse.json({ok:false,error:"SMS provider is not configured."},{status:503});
    const u=new URL(req.url),country=u.searchParams.get("country")||"",service=u.searchParams.get("service")||"";
    if(!country||!service)return NextResponse.json({ok:false,error:"Country and service are required."},{status:400});
    const settings=await getSettings(),operator=String(settings.providerOperator||"any").trim().toLowerCase()||"any";
    const q=await stock(country,service,operator),coins=q.cost?sellCoins(q.cost,settings):0;
    return NextResponse.json({ok:true,stock:{count:Number(q.count||0),sellCoins:coins,usdPrice:settings.coinsPerUsd?coins/settings.coinsPerUsd:0,currency:"USD",coinsPerUsd:settings.coinsPerUsd}});
  }catch{return NextResponse.json({ok:false},{status:502})}
}