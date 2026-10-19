import * as five from "@/lib/fivesim";
import * as tiger from "@/lib/tigersms";
import {getSettings} from "@/lib/settings";
export type SmsProvider="5sim"|"tiger";
export async function activeProvider():Promise<SmsProvider>{
 const s=await getSettings();
 if(s.smsProvider==="tiger" && s.providerTigerEnabled) return "tiger";
 if(s.smsProvider==="5sim" && s.provider5simEnabled) return "5sim";
 if(s.provider5simEnabled) return "5sim";
 if(s.providerTigerEnabled) return "tiger";
 throw new Error("No SMS provider is enabled.");
}
export async function providerName(){return (await activeProvider())==="tiger"?"Tiger SMS":"5SIM"}
export async function providerConfigured(){return (await activeProvider())==="tiger"?tiger.providerConfigured():five.providerConfigured()}
export const configured=providerConfigured;
export async function balance(){return (await activeProvider())==="tiger"?tiger.balance():five.balance()}
export async function listCountries(){return (await activeProvider())==="tiger"?tiger.listCountries():five.listCountries()}
const POPULAR_SERVICE_ORDER=["whatsapp","facebook","instagram","telegram","tiktok","google","snapchat","x","twitter","discord","amazon","microsoft","apple","openai","viber","signal","linkedin","reddit","paypal","uber"] as const;
const SERVICE_ALIASES:Record<string,string[]>={whatsapp:["whatsapp","wa"],facebook:["facebook","fb"],instagram:["instagram","ig","threads"],telegram:["telegram","tg"],tiktok:["tiktok","tt"],google:["google","go"],snapchat:["snapchat","sn"],x:["x","twitter","tw"],discord:["discord"],amazon:["amazon"],microsoft:["microsoft","ms"],apple:["apple"],openai:["openai","chatgpt"],viber:["viber"],signal:["signal"],linkedin:["linkedin"],reddit:["reddit"],paypal:["paypal"],uber:["uber"]};
function serviceRank(service:any){
 const normalize=(v:any)=>String(v||"").toLowerCase().replace(/[^a-z0-9]/g,"");
 const id=normalize(service?.id??service?.code),name=normalize(service?.name);
 for(let rank=0;rank<POPULAR_SERVICE_ORDER.length;rank++){
  const aliases=SERVICE_ALIASES[POPULAR_SERVICE_ORDER[rank]]||[POPULAR_SERVICE_ORDER[rank]];
  if(aliases.some(alias=>{const a=normalize(alias);return id===a||name===a||(a.length>2&&(id.startsWith(a)||name.startsWith(a)))}))return rank;
 }
 return 10000;
}
export async function listServices(){
 const provider=await activeProvider();
 const services=provider==="tiger"?await tiger.listServices():await five.listServices();
 const normalize=(v:any)=>String(v||"").toLowerCase().replace(/[^a-z0-9]/g,"");
 // Remove provider duplicates such as whatsapp2 / telegram2 without changing
 // the upstream service IDs used for valid purchases.
 const withoutNumberedDuplicates=services.filter((s:any)=>{
  const id=normalize(s?.id??s?.code);
  const name=normalize(s?.name);
  return ![id,name].some(value=>/^(whatsapp|wa|telegram|tg|facebook|fb|instagram|ig|tiktok|tt|google|go|snapchat|sn|discord|reddit|viber|signal)\d+$/.test(value));
 });
 const groups:Record<string,string[]> = {
  whatsapp:["whatsapp","wa"], facebook:["facebook","fb"], instagram:["instagram","ig"],
  telegram:["telegram","tg"], tiktok:["tiktok","tt"], google:["google","go"],
  snapchat:["snapchat","sn"], x:["x","twitter","tw"]
 };
 const preferred:Record<string,string> = provider==="tiger"
  ? {whatsapp:"wa",facebook:"fb",instagram:"ig",telegram:"tg",tiktok:"tt",google:"go",snapchat:"sn",x:"tw"}
  : {whatsapp:"whatsapp",facebook:"facebook",instagram:"instagram",telegram:"telegram",tiktok:"tiktok",google:"google",snapchat:"snapchat",x:"twitter"};
 const chosen=new Set<any>();
 const consumed=new Set<string>();
 for(const s of withoutNumberedDuplicates){
  const id=normalize(s?.id??s?.code), name=normalize(s?.name);
  const family=Object.keys(groups).find(k=>(groups[k]||[]).includes(id)||(groups[k]||[]).includes(name));
  if(!family){chosen.add(s);continue;}
  if(consumed.has(family))continue;
  const candidates=withoutNumberedDuplicates.filter((item:any)=>{
   const itemId=normalize(item?.id??item?.code), itemName=normalize(item?.name);
   return (groups[family]||[]).includes(itemId)||(groups[family]||[]).includes(itemName);
  });
  const best=candidates.find((item:any)=>normalize(item?.id??item?.code)===preferred[family])||candidates[0];
  if(best)chosen.add(best);
  consumed.add(family);
 }
 return [...chosen].sort((a:any,b:any)=>serviceRank(a)-serviceRank(b)||String(a.name||a.id).localeCompare(String(b.name||b.id)));
}
export async function servicePrices(service:string,countries:any[]=[]){return (await activeProvider())==="tiger"?tiger.servicePrices(service,countries):five.servicePrices(service,countries)}
export async function stock(country:string,service:string,operator="any"){return (await activeProvider())==="tiger"?tiger.getPrice(country,service,operator):five.stock(country,service,operator)}
export async function getPrice(country:string,service:string,operator="any",provider?:SmsProvider){const p=provider||await activeProvider();return p==="tiger"?tiger.getPrice(country,service,operator):five.getPrice(country,service,operator)}
export async function purchase(country:string,service:string,maxPrice?:number,operator="any",provider?:SmsProvider){const p=provider||await activeProvider();return p==="tiger"?tiger.purchase(country,service,maxPrice,operator):five.purchase(country,service,maxPrice,operator)}
export async function check(orderid:string,provider?:SmsProvider){const p=provider||await activeProvider();return p==="tiger"?tiger.check(orderid):five.check(orderid)}
export async function finalize(orderid:string,provider?:SmsProvider){const p=provider||await activeProvider();return p==="tiger"?tiger.finalize(orderid):five.finalize(orderid)}
export async function cancel(orderid:string,provider?:SmsProvider){const p=provider||await activeProvider();return p==="tiger"?tiger.cancel(orderid):five.cancel(orderid)}
