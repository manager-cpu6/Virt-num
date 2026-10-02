const base=process.env.SMSPOOL_BASE_URL||"https://api.smspool.net";
const key=process.env.SMSPOOL_API_KEY;
async function req(path:string,data:Record<string,string|number>={},method:"POST"|"GET"="POST"){
 if(!key)throw new Error("SMSPool API is not configured");
 const r=await fetch(base+path,{method,headers:{"Content-Type":"application/x-www-form-urlencoded"},body:method==="POST"?new URLSearchParams(Object.entries({key,...data}).map(([k,v])=>[k,String(v)])):undefined,cache:"no-store"});
 const j=await r.json();if(!r.ok)throw new Error(j?.message||`SMSPool HTTP ${r.status}`);if(j?.success===0)throw new Error(j?.message||j?.type||"SMSPool request failed");return j;
}
export function providerConfigured(){return !!key}
export async function listCountries(){return req("/country/retrieve_all",{},"GET")}
export async function listServices(){return req("/service/retrieve_all",{},"GET")}
let serviceCache:{at:number;items:any[]}|null=null;
async function providerServices(){
 if(serviceCache&&Date.now()-serviceCache.at<5*60*1000)return serviceCache.items;
 const raw=await listServices();const items=Array.isArray(raw)?raw:(raw?.services||raw?.result||raw?.data||[]);
 serviceCache={at:Date.now(),items:Array.isArray(items)?items:[]};return serviceCache.items;
}
const aliases:Record<string,string[]>={
 whatsapp:["whatsapp"],telegram:["telegram"],google:["google","google voice"],facebook:["facebook"],instagram:["instagram"],tiktok:["tiktok"],snapchat:["snapchat"],x:["x","twitter"],discord:["discord"],amazon:["amazon"],microsoft:["microsoft"],apple:["apple"]
};
function norm(v:any){return String(v??"").trim().toLowerCase().replace(/[^a-z0-9]+/g,"")}
export async function resolveService(service:string){
 const wanted=norm(service);const candidates=aliases[wanted]||[service];const list=await providerServices();
 for(const candidate of candidates){
  const n=norm(candidate);const hit=list.find((x:any)=>[x.id,x.service,x.name,x.short_name,x.code].some((v:any)=>norm(v)===n));
  if(hit)return String(hit.id??hit.service??hit.name);
 }
 const direct=list.find((x:any)=>[x.id,x.service,x.name,x.short_name,x.code].some((v:any)=>norm(v)===wanted));
 return direct?String(direct.id??direct.service??direct.name):service;
}
export async function stock(country:string,service:string){return req("/sms/stock",{country,service:await resolveService(service)})}
export async function purchase(country:string,service:string){return req("/purchase/sms",{country,service:await resolveService(service),pricing_option:0})}
export async function check(orderid:string){return req("/sms/check",{orderid})}
export async function cancel(orderid:string){return req("/sms/cancel",{orderid})}
export async function balance(){return req("/request/balance")}
export const APP_SERVICES=[
{id:"whatsapp",name:"WhatsApp",icon:"◉"},{id:"telegram",name:"Telegram",icon:"✈"},{id:"google",name:"Google",icon:"G"},{id:"facebook",name:"Facebook",icon:"f"},{id:"instagram",name:"Instagram",icon:"◎"},{id:"tiktok",name:"TikTok",icon:"♪"},{id:"snapchat",name:"Snapchat",icon:"◆"},{id:"x",name:"X",icon:"𝕏"},{id:"discord",name:"Discord",icon:"◌"},{id:"amazon",name:"Amazon",icon:"a"},{id:"microsoft",name:"Microsoft",icon:"⊞"},{id:"apple",name:"Apple",icon:"●"},
{id:"signal",name:"Signal",icon:"S"},{id:"viber",name:"Viber",icon:"V"},{id:"line",name:"LINE",icon:"L"},{id:"imo",name:"imo",icon:"i"},{id:"wechat",name:"WeChat",icon:"W"},{id:"aliexpress",name:"AliExpress",icon:"A"},{id:"alibaba",name:"Alibaba",icon:"A"},{id:"airbnb",name:"Airbnb",icon:"A"},{id:"uber",name:"Uber",icon:"U"},{id:"ubereats",name:"Uber Eats",icon:"U"},{id:"bolt",name:"Bolt",icon:"B"},{id:"netflix",name:"Netflix",icon:"N"},{id:"spotify",name:"Spotify",icon:"S"},{id:"steam",name:"Steam",icon:"S"},{id:"reddit",name:"Reddit",icon:"R"},{id:"linkedin",name:"LinkedIn",icon:"in"},{id:"pinterest",name:"Pinterest",icon:"P"},{id:"roblox",name:"Roblox",icon:"R"},{id:"twitch",name:"Twitch",icon:"T"},{id:"skype",name:"Skype",icon:"S"},{id:"yahoo",name:"Yahoo",icon:"Y"},{id:"yandex",name:"Yandex",icon:"Y"},{id:"proton",name:"Proton",icon:"P"},{id:"binance",name:"Binance",icon:"B"},{id:"coinbase",name:"Coinbase",icon:"C"},{id:"kucoin",name:"KuCoin",icon:"K"},{id:"bybit",name:"Bybit",icon:"B"},{id:"okx",name:"OKX",icon:"O"},{id:"discord",name:"Discord",icon:"◌"},{id:"shopify",name:"Shopify",icon:"S"},{id:"paypal",name:"PayPal",icon:"P"},{id:"booking",name:"Booking.com",icon:"B"},{id:"steam",name:"Steam",icon:"S"},{id:"epicgames",name:"Epic Games",icon:"E"},{id:"playstation",name:"PlayStation",icon:"P"},{id:"xbox",name:"Xbox",icon:"X"},{id:"tinder",name:"Tinder",icon:"T"},{id:"bumble",name:"Bumble",icon:"B"},{id:"indeed",name:"Indeed",icon:"I"},{id:"quora",name:"Quora",icon:"Q"},{id:"notion",name:"Notion",icon:"N"},{id:"zoom",name:"Zoom",icon:"Z"},{id:"canva",name:"Canva",icon:"C"},{id:"openai",name:"OpenAI",icon:"AI"}
];
export function normalizeList(raw:any,key:string){const v=Array.isArray(raw)?raw:(raw?.[key]||raw?.result||raw?.data||[]);return Array.isArray(v)?v:[]}
