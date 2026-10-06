import {NextResponse} from "next/server";
import {listCountries,providerConfigured,servicePrices} from "@/lib/fivesim";
import {getSettings,sellCoins} from "@/lib/settings";
export const runtime="nodejs";
export const dynamic="force-dynamic";

function flag(iso:string){
  const code=String(iso||"").toUpperCase();
  return /^[A-Z]{2}$/.test(code)?String.fromCodePoint(...[...code].map(c=>127397+c.charCodeAt(0))):"🌐";
}
export async function GET(req:Request){
  try{
    if(!providerConfigured())return NextResponse.json({ok:false,live:false,countries:[],error:"SMS provider is not configured."},{status:503});
    const service=new URL(req.url).searchParams.get("service")||"";
    if(!service)return NextResponse.json({ok:false,error:"Service is required."},{status:400});
    const [countries,settings]=await Promise.all([listCountries(),getSettings()]);
    const prices=await servicePrices(service,countries);
    const result=countries.map((c:any)=>{
      const p=prices[String(c.id)];
      const cost=Number(p?.cost||0),count=Number(p?.count||0),coins=cost>0?sellCoins(cost,settings):0;
      return {...c,flag:flag(c.iso),stock:{count,physicalCount:count,sellCoins:coins,usdPrice:coins/settings.coinsPerUsd}};
    });
    return NextResponse.json({ok:true,live:true,countryCount:result.length,countries:result});
  }catch(e){
    return NextResponse.json({ok:false,live:false,countries:[],error:"Unable to load live countries."},{status:502});
  }
}