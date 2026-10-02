const base=(process.env.SMSPOOL_BASE_URL||"https://api.smspool.net").replace(/\/$/,"");
const key=process.env.SMSPOOL_API_KEY?.trim();
async function req(path:string,data:Record<string,string|number>={},method:"POST"|"GET"="POST"){
 if(!key)throw new Error("SMSPool API is not configured");
 const init:any={method,headers:{"Content-Type":"application/x-www-form-urlencoded","Accept":"application/json"},cache:"no-store"};
 if(method==="POST")init.body=new URLSearchParams(Object.entries({key,...data}).map(([k,v])=>[k,String(v)]));
 const r=await fetch(base+path,init);const j=await r.json().catch(()=>null);
 if(!r.ok)throw new Error(j?.message||j?.type||`SMSPool HTTP ${r.status}`);
 if(j?.success===0)throw new Error(j?.message||j?.type||"SMSPool request failed");
 return j;
}
export function providerConfigured(){return !!key}
export async function listCountries(){return req("/country/retrieve_all",{},"GET")}
export async function listServices(){return req("/service/retrieve_all",{},"GET")}
let serviceCache:{at:number;items:any[]}|null=null;
function asArray(raw:any,key:string){if(Array.isArray(raw))return raw;const v=raw?.[key]??raw?.result??raw?.data;if(Array.isArray(v))return v;if(v&&typeof v==="object")return Object.entries(v).map(([k,val]:any)=>val&&typeof val==="object"?{id:val.id??k,...val}:{id:k,name:String(val)});if(raw&&typeof raw==="object")return Object.entries(raw).map(([k,val]:any)=>val&&typeof val==="object"?{id:val.id??k,...val}:{id:k,name:String(val)});return []}
async function providerServices(){if(serviceCache&&Date.now()-serviceCache.at<5*60*1000)return serviceCache.items;const items=asArray(await listServices(),"services");serviceCache={at:Date.now(),items};return items}
const aliases:Record<string,string[]>={
 whatsapp:["whatsapp","wa"],telegram:["telegram","tg"],google:["google","google voice","googlevoice"],facebook:["facebook","fb"],instagram:["instagram","ig"],tiktok:["tiktok","tt"],snapchat:["snapchat"],x:["x","twitter"],discord:["discord"],amazon:["amazon"],microsoft:["microsoft"],apple:["apple"],signal:["signal"],viber:["viber"],line:["line"],imo:["imo"],wechat:["wechat"],aliexpress:["aliexpress"],alibaba:["alibaba"],airbnb:["airbnb"],uber:["uber"],ubereats:["ubereats","uber eats"],bolt:["bolt"],netflix:["netflix"],spotify:["spotify"],steam:["steam"],reddit:["reddit"],linkedin:["linkedin"],pinterest:["pinterest"],roblox:["roblox"],twitch:["twitch"],skype:["skype"],yahoo:["yahoo"],yandex:["yandex"],proton:["proton"],binance:["binance"],coinbase:["coinbase"],kucoin:["kucoin"],bybit:["bybit"],okx:["okx"],shopify:["shopify"],paypal:["paypal"],booking:["booking","booking.com"],epicgames:["epicgames","epic games"],playstation:["playstation"],xbox:["xbox"],tinder:["tinder"],bumble:["bumble"],indeed:["indeed"],quora:["quora"],notion:["notion"],zoom:["zoom"],canva:["canva"],openai:["openai","chatgpt"]
};
function norm(v:any){return String(v??"").trim().toLowerCase().replace(/[^a-z0-9]+/g,"")}
export async function resolveService(service:string){
 const wanted=norm(service),candidates=aliases[wanted]||[service],list=await providerServices();
 for(const candidate of candidates){const n=norm(candidate);const hit=list.find((x:any)=>[x.id,x.service,x.name,x.short_name,x.code].some((v:any)=>norm(v)===n));if(hit)return String(hit.id??hit.service??hit.name??candidate)}
 const direct=list.find((x:any)=>[x.id,x.service,x.name,x.short_name,x.code].some((v:any)=>norm(v)===wanted));
 return direct?String(direct.id??direct.service??direct.name):service;
}
export async function stock(country:string,service:string){const resolved=await resolveService(service);return req("/sms/stock",{country,service:resolved})}
export async function purchase(country:string,service:string){return req("/purchase/sms",{country,service:await resolveService(service),pricing_option:0})}
export async function check(orderid:string){return req("/sms/check",{orderid})}
export async function cancel(orderid:string){return req("/sms/cancel",{orderid})}
export async function balance(){return req("/request/balance")}
export const APP_SERVICES=[
{id:"whatsapp",name:"WhatsApp",icon:"◉"},{id:"telegram",name:"Telegram",icon:"✈"},{id:"google",name:"Google",icon:"G"},{id:"facebook",name:"Facebook",icon:"f"},{id:"instagram",name:"Instagram",icon:"◎"},{id:"tiktok",name:"TikTok",icon:"♪"},{id:"snapchat",name:"Snapchat",icon:"◆"},{id:"x",name:"X",icon:"𝕏"},{id:"discord",name:"Discord",icon:"◌"},{id:"amazon",name:"Amazon",icon:"a"},{id:"microsoft",name:"Microsoft",icon:"⊞"},{id:"apple",name:"Apple",icon:"●"},{id:"signal",name:"Signal",icon:"S"},{id:"viber",name:"Viber",icon:"V"},{id:"line",name:"LINE",icon:"L"},{id:"imo",name:"imo",icon:"i"},{id:"wechat",name:"WeChat",icon:"W"},{id:"aliexpress",name:"AliExpress",icon:"A"},{id:"alibaba",name:"Alibaba",icon:"A"},{id:"airbnb",name:"Airbnb",icon:"A"},{id:"uber",name:"Uber",icon:"U"},{id:"ubereats",name:"Uber Eats",icon:"U"},{id:"bolt",name:"Bolt",icon:"B"},{id:"netflix",name:"Netflix",icon:"N"},{id:"spotify",name:"Spotify",icon:"S"},{id:"steam",name:"Steam",icon:"S"},{id:"reddit",name:"Reddit",icon:"R"},{id:"linkedin",name:"LinkedIn",icon:"in"},{id:"pinterest",name:"Pinterest",icon:"P"},{id:"roblox",name:"Roblox",icon:"R"},{id:"twitch",name:"Twitch",icon:"T"},{id:"skype",name:"Skype",icon:"S"},{id:"yahoo",name:"Yahoo",icon:"Y"},{id:"yandex",name:"Yandex",icon:"Y"},{id:"proton",name:"Proton",icon:"P"},{id:"binance",name:"Binance",icon:"B"},{id:"coinbase",name:"Coinbase",icon:"C"},{id:"kucoin",name:"KuCoin",icon:"K"},{id:"bybit",name:"Bybit",icon:"B"},{id:"okx",name:"OKX",icon:"O"},{id:"shopify",name:"Shopify",icon:"S"},{id:"paypal",name:"PayPal",icon:"P"},{id:"booking",name:"Booking.com",icon:"B"},{id:"epicgames",name:"Epic Games",icon:"E"},{id:"playstation",name:"PlayStation",icon:"P"},{id:"xbox",name:"Xbox",icon:"X"},{id:"tinder",name:"Tinder",icon:"T"},{id:"bumble",name:"Bumble",icon:"B"},{id:"indeed",name:"Indeed",icon:"I"},{id:"quora",name:"Quora",icon:"Q"},{id:"notion",name:"Notion",icon:"N"},{id:"zoom",name:"Zoom",icon:"Z"},{id:"canva",name:"Canva",icon:"C"},{id:"openai",name:"OpenAI",icon:"AI"}
];
export function normalizeList(raw:any,key:string){return asArray(raw,key)}
