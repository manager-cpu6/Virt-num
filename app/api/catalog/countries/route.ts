import {NextResponse} from "next/server";
import {listCountries,providerConfigured,servicePrices} from "@/lib/sms-provider";
import {getSettings,sellCoins} from "@/lib/settings";
export const runtime="nodejs";
export const dynamic="force-dynamic";

const countryIso:Record<string,string>={
  argentina:"AR",argentines:"AR",argentina vip:"AR",
  "united states":"US","united states of america":"US","united states vip":"US",usa:"US",
  "united kingdom":"GB","great britain":"GB",uk:"GB",
  canada:"CA",australia:"AU",ethiopia:"ET",somalia:"SO",kenya:"KE",
  germany:"DE",france:"FR",spain:"ES",italy:"IT",netherlands:"NL",
  brazil:"BR",mexico:"MX",india:"IN",pakistan:"PK",bangladesh:"BD",
  turkey:"TR",russia:"RU",ukraine:"UA",japan:"JP",china:"CN",
  "south korea":"KR",indonesia:"ID",malaysia:"MY",thailand:"TH",
  philippines:"PH",vietnam:"VN",nigeria:"NG",ghana:"GH",egypt:"EG",
  "south africa":"ZA",morocco:"MA",saudiarabia:"SA","saudi arabia":"SA",
  "united arab emirates":"AE",uae:"AE",qatar:"QA",kuwait:"KW",
  sweden:"SE",norway:"NO",denmark:"DK",finland:"FI",switzerland:"CH",
  poland:"PL",portugal:"PT",ireland:"IE",belgium:"BE",austria:"AT",
  greece:"GR",romania:"RO",serbia:"RS",croatia:"HR",bulgaria:"BG",
  colombia:"CO",chile:"CL",peru:"PE",venezuela:"VE",ecuador:"EC",
  "new zealand":"NZ",singapore:"SG",taiwan:"TW",israel:"IL",iran:"IR",
  iraq:"IQ",jordan:"JO",lebanon:"LB",nepal:"NP",srilanka:"LK"
};
function resolveIso(country:any){
  for(const candidate of [country?.iso,country?.iso2,country?.isoCode,country?.countryCode,country?.code]){
    const code=String(candidate||"").trim().toUpperCase();
    if(/^[A-Z]{2}$/.test(code))return code;
  }
  const normalize=(value:any)=>String(value||"").toLowerCase().replace(/\b(vip|premium|new|best|special)\b/g," ").replace(/[^a-z]/g,"").trim();
  const names=[country?.name,country?.title,country?.country,country?.id].map(normalize).filter(Boolean);
  for(const name of names){if(countryIso[name])return countryIso[name];}
  return "";
}
function flag(iso:string){
  const code=String(iso||"").toUpperCase();
  return /^[A-Z]{2}$/.test(code)?String.fromCodePoint(...[...code].map(c=>127397+c.charCodeAt(0))):"";
}
export async function GET(req:Request){
  try{
    if(!(await providerConfigured()))return NextResponse.json({ok:false,live:false,countries:[],error:"Number service is temporarily unavailable. Please try again shortly."},{status:503});
    const service=new URL(req.url).searchParams.get("service")||"";
    if(!service)return NextResponse.json({ok:false,error:"Service is required."},{status:400});
    const [countries,settings]=await Promise.all([listCountries(),getSettings()]);
    const prices=await servicePrices(service,countries);
    const result=countries.map((c:any)=>{
      const keys=[c.id,c.country,c.iso,c.iso2,c.code,c.name].map((v:any)=>String(v??""));
      const p=keys.map(key=>prices?.[key]).find(Boolean);
      const cost=Number(p?.cost??p?.price??p?.usdPrice??p?.priceUsd??0);
      const count=Number(p?.count??p?.stock??0);
      const coins=cost>0?sellCoins(cost,settings):0;
      const coinsPerUsd=Number(settings.coinsPerUsd)||100;
      const usdPrice=coins>0?Number((coins/coinsPerUsd).toFixed(2)):0;
      const iso=resolveIso(c);
      return {...c,iso:iso||c.iso||c.iso2||"",flag:flag(iso)||c.flag||"",stock:{count,physicalCount:count,sellCoins:coins,usdPrice,priceUsd:usdPrice,currency:"USD"}};
    }).filter((c:any)=>Number(c?.stock?.count||0)>=1);
    return NextResponse.json({ok:true,live:true,countryCount:result.length,countries:result});
  }catch(e){
    return NextResponse.json({ok:false,live:false,countries:[],error:"Unable to load live countries."},{status:502});
  }
}
