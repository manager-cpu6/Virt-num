import {NextResponse} from "next/server";
import {listCountries,providerConfigured,servicePrices} from "@/lib/smspool";
import {getSettings,sellCoins} from "@/lib/settings";
import {countries as fallbackCountries} from "@/lib/data";
export const runtime="nodejs";
export const dynamic="force-dynamic";

function flag(name:string){
 const a:Record<string,string>={"united states":"US","united kingdom":"GB","canada":"CA","germany":"DE","france":"FR","netherlands":"NL","spain":"ES","australia":"AU","ethiopia":"ET","kenya":"KE","somalia":"SO","nigeria":"NG","south africa":"ZA","tanzania":"TZ","uganda":"UG","ghana":"GH","rwanda":"RW","burundi":"BI","cameroon":"CM","china":"CN","turkey":"TR","india":"IN","italy":"IT","japan":"JP","brazil":"BR","mexico":"MX"};
 const code=a[name.toLowerCase().trim()]||"";
 return code?String.fromCodePoint(...[...code].map(c=>127397+c.charCodeAt(0))):"🌐";
}
const fallback=fallbackCountries.map(c=>({id:c.code,code:c.code,name:c.name,short_name:c.name,flag:c.flag||flag(c.name)}));

export async function GET(req:Request){
 try{
  if(!providerConfigured())return NextResponse.json({ok:true,live:false,countries:fallback});
  const service=new URL(req.url).searchParams.get("service")||"";
  const countries=await listCountries();
  const settings=await getSettings();
  const prices=service?await servicePrices(service,countries):{};
  const result=countries.map((c:any)=>{
   const id=String(c.id);
   const p=(prices as any)[id];
   const coins=p?sellCoins(Number(p.cost||0),settings):0;
   return {...c,flag:flag(String(c.name||c.eng||"")),stock:p?{count:Number(p.count||0),physicalCount:Number(p.physicalCount||0),providerCost:Number(p.cost||0),sellCoins:coins,usdPrice:settings.coinsPerUsd?coins/settings.coinsPerUsd:0}:null};
  });
  return NextResponse.json({ok:true,live:true,countries:result});
 }catch{
  return NextResponse.json({ok:true,live:false,countries:fallback});
 }
}