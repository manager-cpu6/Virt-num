const BASE="https://5sim.net";
const key=(process.env.FIVESIM_API_KEY||process.env.SMSACTIVATE_API_KEY||"").trim();
const TTL=5*60*1000;

type Cache<T>={at:number;value:T};
let countriesCache:Cache<any[]>|null=null;
let servicesCache:Cache<any[]>|null=null;
let pricesCache=new Map<string,Cache<any>>();

function configured(){return !!key}
export function providerConfigured(){return configured()}

class FiveSimError extends Error {
  status:number;
  providerBody:string;
  constructor(status:number,body:string){
    const clean=String(body||"").trim().replace(/\\s+/g," ").slice(0,300);
    super("5SIM HTTP "+status+": "+clean);
    this.name="FiveSimError";
    this.status=status;
    this.providerBody=clean;
  }
}

async function request(path:string,init:RequestInit={}) {
  const headers=new Headers(init.headers);
  headers.set("Accept","application/json");
  if(key) headers.set("Authorization","Bearer "+key);
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),12000);
  try{
    const r=await fetch(BASE+path,{...init,headers,cache:"no-store",signal:controller.signal});
    const text=await r.text();
    let body:any=text;
    try{body=JSON.parse(text)}catch{}
    if(!r.ok){
      const detail=typeof body==="string"?body:(body?.message||body?.error||text||"5SIM request failed");
      throw new FiveSimError(r.status,String(detail));
    }
    return body;
  }finally{clearTimeout(timer)}
}

async function guest(path:string){return request(path,{headers:{"User-Agent":"Numelixa/3.0"}})}
async function user(path:string){if(!key)throw new Error("FIVESIM_API_KEY is not configured. Add the 5SIM protocol API key in Vercel Production.");return request(path,{headers:{"User-Agent":"Numelixa/3.0"}})}

function humanize(value:string){
  const special:Record<string,string>={
    whatsapp:"WhatsApp",telegram:"Telegram",google:"Google",facebook:"Facebook",
    instagram:"Instagram/Threads",tiktok:"TikTok",twitter:"X / Twitter",x:"X",
    snapchat:"Snapchat",viber:"Viber",discord:"Discord",amazon:"Amazon",
    microsoft:"Microsoft",apple:"Apple",signal:"Signal",wechat:"WeChat",
    yahoo:"Yahoo",openai:"OpenAI/ChatGPT",claudeai:"Claude AI/Anthropic",
    linkedin:"LinkedIn",paypal:"PayPal",reddit:"Reddit",uber:"Uber",
    airbnb:"Airbnb",tinder:"Tinder",bluesky:"Bluesky",meta:"Meta"
  };
  if(special[value.toLowerCase()])return special[value.toLowerCase()];
  return value.replace(/[_-]+/g," ").replace(/\b\w/g,c=>c.toUpperCase()).replace(/\bAi\b/gi,"AI");
}

function isoFromCountry(v:any){
  const iso=v?.iso;
  if(iso&&typeof iso==="object"){
    const k=Object.keys(iso)[0];
    if(k)return k.toUpperCase();
  }
  if(typeof iso==="string")return iso.toUpperCase();
  return "";
}

export async function balance(){
  const p=await user("/v1/user/profile");
  return Number(p?.balance||0);
}

export async function listCountries(){
  if(countriesCache&&Date.now()-countriesCache.at<TTL)return countriesCache.value;
  const raw=await guest("/v1/guest/countries");
  const items=Object.entries(raw||{}).map(([slug,v]:any)=>({
    id:String(slug),
    code:String(slug),
    name:String(v?.text_en||slug),
    short_name:String(v?.text_en||slug),
    iso:isoFromCountry(v),
    prefix:String(Object.keys(v?.prefix||{})[0]||""),
  }));
  countriesCache={at:Date.now(),value:items};
  return items;
}

export async function listServices(){
  if(servicesCache&&Date.now()-servicesCache.at<TTL)return servicesCache.value;
  const raw=await guest("/v1/guest/prices");
  const seen=new Map<string,{id:string;code:string;name:string;icon?:string}>();
  for(const countryTree of Object.values(raw||{}) as any[]){
    if(!countryTree||typeof countryTree!=="object")continue;
    for(const product of Object.keys(countryTree)){
      const id=String(product);
      if(!seen.has(id))seen.set(id,{id,code:id,name:humanize(id)});
    }
  }
  const items=[...seen.values()].sort((a,b)=>a.name.localeCompare(b.name));
  servicesCache={at:Date.now(),value:items};
  return items;
}

function quoteForOperator(productTree:any,operator="any"){
  const tree=productTree||{};
  if(operator&&operator.toLowerCase()!=="any"){
    const x=tree[operator]||tree[operator.toLowerCase()]||tree[operator.toUpperCase()];
    if(!x||!Number.isFinite(Number(x.cost)))return {cost:0,count:0,rate:0,operator};
    return {cost:Number(x.cost||0),count:Number(x.count||0),rate:Number(x.rate||0),operator};
  }
  const candidates=Object.entries(tree).map(([op,x]:any)=>({...x,operator:String(op)}));
  const usable=candidates.filter(x=>Number(x?.count||0)>0&&Number.isFinite(Number(x?.cost)));
  const list=(usable.length?usable:candidates).filter(x=>Number.isFinite(Number(x?.cost)));
  if(!list.length)return {cost:0,count:0,rate:0,operator:"any"};
  list.sort((a,b)=>Number(a.cost)-Number(b.cost));
  const x=list[0];
  return {cost:Number(x.cost||0),count:Number(x.count||0),rate:Number(x.rate||0),operator:String(x.operator||"any")};
}

function bestOperator(productTree:any){return quoteForOperator(productTree,"any")}

export async function getPrice(country:string,service:string,operator="any"){
  const raw=await guest("/v1/guest/prices?country="+encodeURIComponent(country)+"&product="+encodeURIComponent(service));

  // 5SIM's new protocol can return the filtered tree as:
  // { product: { country: { operator: { cost, count, rate } } } }
  // or, depending on the endpoint response, { country: { product: { ... } } }.
  // Never pass the whole product tree to bestOperator: that could select
  // the cheapest operator from a DIFFERENT country and make maxPrice fail.
  const byProduct=raw?.[service];
  const root=
    byProduct?.[country] ||
    byProduct?.[String(country).toLowerCase()] ||
    raw?.[country]?.[service] ||
    raw?.[String(country).toLowerCase()]?.[service] ||
    {};

  const quote=quoteForOperator(root,operator);
  return quote;
}

export async function stock(country:string,service:string,operator="any"){return getPrice(country,service,operator)}

export async function servicePrices(service:string,countries:any[]=[]){
  const cacheKey=service.toLowerCase();
  const cached=pricesCache.get(cacheKey);
  if(cached&&Date.now()-cached.at<TTL)return cached.value;
  const raw=await guest("/v1/guest/prices?product="+encodeURIComponent(service));
  const out:Record<string,{cost:number;count:number;rate:number}>={};
  // 5SIM returns /prices?product=... as: { product: { country: { operator: ... } } }
  const productTree=(raw as any)?.[service] || {};
  for(const [country,countryTree] of Object.entries(productTree)){ 
    const p=bestOperator(countryTree);
    const match=countries.find(c=>String(c.id).toLowerCase()===String(country).toLowerCase());
    const id=String(match?.id||country);
    out[id]=p;
  }
  pricesCache.set(cacheKey,{at:Date.now(),value:out});
  return out;
}

export async function purchase(country:string,service:string,maxPrice?:number,operator="any"){
  const selectedOperator=String(operator||"any").trim().toLowerCase()||"any";

  // Read the live quote immediately before purchase. The quote is used as a
  // safety ceiling, not as a stale price that must be sent to 5SIM.
  const fresh=await getPrice(country,service,selectedOperator);
  if(!fresh.count||!fresh.cost){
    throw new Error(selectedOperator==="any"?"NO_FREE_PHONES":"OPERATOR_OUT_OF_STOCK");
  }

  const quoteCeiling=Number.isFinite(Number(maxPrice))&&Number(maxPrice)>0
    ? Number(maxPrice)
    : Number(fresh.cost);

  const profile=await user("/v1/user/profile");
  const providerBalance=Number(profile?.balance||0);
  if(!Number.isFinite(providerBalance)||providerBalance<Number(fresh.cost)){
    throw new Error("PROVIDER_BALANCE_TOO_LOW");
  }

  // 5SIM New Protocol accepts the normal buy URL directly. Do not make
  // maxPrice mandatory: doing so can turn a valid live purchase into a
  // false failure when the provider quote changes between two requests.
  // We still enforce our own price ceiling after the provider responds.
  const path="/v1/user/buy/activation/"
    +encodeURIComponent(country)+"/"
    +encodeURIComponent(selectedOperator)+"/"
    +encodeURIComponent(service);

  let p:any;
  try{
    p=await user(path);
  }catch(first){
    const msg=first instanceof Error?first.message:String(first);
    // A single retry is allowed only for a transient provider stock race.
    if(!/no free phones|price|maxprice|stock|temporarily unavailable/i.test(msg))throw first;
    const retryQuote=await getPrice(country,service,selectedOperator);
    if(!retryQuote.count||!retryQuote.cost)throw new Error("NO_FREE_PHONES");
    p=await user(path);
  }

  if(!p?.id||!p?.phone)throw new Error("5SIM did not return an activation number.");

  const providerCost=Number(p.price||fresh.cost);
  if(!Number.isFinite(providerCost)||providerCost<=0){
    throw new Error("5SIM returned an invalid purchase price.");
  }

  // Never let a stale price make Numelixa undercharge. If 5SIM returns a
  // higher price than our approved ceiling, cancel the activation immediately.
  if(Number.isFinite(quoteCeiling)&&quoteCeiling>0&&providerCost>quoteCeiling){
    try{await cancel(String(p.id))}catch{}
    throw new Error("PRICE_CHANGED");
  }

  const expiresAt=p?.expires?new Date(p.expires):null;
  return {
    success:1,
    order_id:String(p.id),
    number:String(p.phone),
    country:String(p.country||country),
    service:String(p.product||service),
    expires_in:expiresAt
      ? Math.max(0,Math.floor((expiresAt.getTime()-Date.now())/1000))
      :600,
    expires_at:expiresAt?.toISOString()||null,
    operator:String(p.operator||selectedOperator),
    providerCost
  };
}
export async function check(orderid:string){
  const p=await user("/v1/user/check/"+encodeURIComponent(orderid));
  const sms=Array.isArray(p?.sms)?p.sms:[];
  if(sms.length){
    const latest=sms[sms.length-1]||{};
    const value=String(latest.code||latest.text||"");
    return {status:3,sms:value,fullSms:String(latest.text||value),providerStatus:String(p?.status||"RECEIVED")};
  }
  const s=String(p?.status||"PENDING").toUpperCase();
  if(s==="CANCELED"||s==="TIMEOUT"||s==="BANNED")return {status:6,sms:"",providerStatus:s};
  if(s==="FINISHED")return {status:3,sms:"",providerStatus:s};
  return {status:1,sms:"",providerStatus:s,time_left:p?.expires?Math.max(0,Math.floor((new Date(p.expires).getTime()-Date.now())/1000)):null};
}

export async function finalize(orderid:string){return user("/v1/user/finish/"+encodeURIComponent(orderid))}
export async function cancel(orderid:string){return user("/v1/user/cancel/"+encodeURIComponent(orderid))}

export function normalizeList(raw:any,key?:string){
  if(key&&raw?.[key])return raw[key];
  return Array.isArray(raw)?raw:[];
}
