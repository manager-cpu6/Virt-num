const BASE="https://5sim.net";
const key=(process.env.FIVESIM_API_KEY||process.env.SMSACTIVATE_API_KEY||"").trim();
const TTL=5*60*1000;

type Cache<T>={at:number;value:T};
let countriesCache:Cache<any[]>|null=null;
let servicesCache:Cache<any[]>|null=null;
let pricesCache=new Map<string,Cache<any>>();

function configured(){return !!key}
export function providerConfigured(){return configured()}

const COUNTRY_ALIASES:Record<string,string>={
  us:"usa", usa:"usa",
  uk:"uk", gb:"uk",
  ae:"uae", uae:"uae",
  sa:"saudiarabia", "saudi-arabia":"saudiarabia",
  tz:"tanzania", ng:"nigeria", ke:"kenya", et:"ethiopia"
};

function normalizeCountryInput(value:string){
  const raw=String(value||"").trim().toLowerCase();
  return COUNTRY_ALIASES[raw]||raw;
}

async function resolvePublicCountry(value:string){
  const normalized=normalizeCountryInput(value);
  if(!/^[a-z0-9_-]{2,40}$/.test(normalized)) throw new Error("INVALID_COUNTRY");
  const countries=await listCountries();
  const found=countries.find(c=>String(c.id).toLowerCase()===normalized);
  if(!found) throw new Error("INVALID_COUNTRY");
  return String(found.id);
}

async function resolvePublicService(value:string){
  const service=String(value||"").trim().toLowerCase();
  if(!/^[a-z0-9_-]{2,60}$/.test(service)) throw new Error("INVALID_SERVICE");
  const services=await listServices();
  if(!services.some(s=>String(s.id).toLowerCase()===service)) throw new Error("INVALID_SERVICE");
  return service;
}

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
    let parsed=false;
    try{body=JSON.parse(text);parsed=true}catch{}
    // 5SIM can return an HTTP 200 response with a plain-text provider
    // error such as "no free phones". Never let that fall through to the
    // activation parser as if it were a successful purchase response.
    if(!r.ok || !parsed){
      const detail=typeof body==="string"
        ? body
        : (body?.message||body?.error||text||"5SIM request failed");
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

  // The new-protocol price endpoint has appeared in both
  // { country: { product: { operator: quote } } } and
  // { product: { country: { operator: quote } } } shapes.
  // Treat a top-level key as a country only when it matches the live
  // country catalog; otherwise treat it as a product. This prevents
  // countries from accidentally being rendered as services.
  const countries=await listCountries();
  const countryIds=new Set(countries.map((c:any)=>String(c.id).toLowerCase()));
  for(const [outerKey,outerValue] of Object.entries(raw||{}) as [string,any][]){
    if(!outerValue||typeof outerValue!=="object"||Array.isArray(outerValue))continue;
    const outerIsCountry=countryIds.has(String(outerKey).toLowerCase());
    if(outerIsCountry){
      for(const product of Object.keys(outerValue)){
        const id=String(product).trim().toLowerCase();
        if(/^[a-z0-9_-]{2,60}$/.test(id)&&!seen.has(id)){
          seen.set(id,{id,code:id,name:humanize(id)});
        }
      }
    }else{
      const id=String(outerKey).trim().toLowerCase();
      // A product node contains country nodes; avoid accidentally treating
      // a malformed response or metadata field as a service.
      const hasCountryChildren=Object.keys(outerValue).some(k=>countryIds.has(String(k).toLowerCase()));
      if(hasCountryChildren&&/^[a-z0-9_-]{2,60}$/.test(id)&&!seen.has(id)){
        seen.set(id,{id,code:id,name:humanize(id)});
      }
    }
  }
  // Put widely used verification services first, but only if the provider
  // actually returned them. Never fabricate catalog entries or stock.
  const popular=[
    "whatsapp","facebook","telegram","google","instagram","tiktok","twitter",
    "snapchat","microsoft","apple","discord","amazon","paypal","uber","reddit",
    "linkedin","signal","viber","tinder","wechat","yahoo","openai"
  ];
  const rank=new Map(popular.map((id,index)=>[id,index]));
  const items=[...seen.values()].sort((a,b)=>{
    const ar=rank.has(a.id.toLowerCase())?rank.get(a.id.toLowerCase())!:-1;
    const br=rank.has(b.id.toLowerCase())?rank.get(b.id.toLowerCase())!:-1;
    if(ar>=0&&br<0)return -1;
    if(br>=0&&ar<0)return 1;
    if(ar>=0&&br>=0)return ar-br;
    return a.name.localeCompare(b.name);
  });
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
  // For operator=any, 5SIM itself decides which operator to issue.
  // If the filtered price tree contains an explicit "any" quote, that is
  // the only safe quote to use for the purchase ceiling.
  const anyQuote=tree["any"]||tree["ANY"];
  if(anyQuote&&Number.isFinite(Number(anyQuote.cost))){
    return {
      cost:Number(anyQuote.cost||0),
      count:Number(anyQuote.count||0),
      rate:Number(anyQuote.rate||0),
      operator:"any"
    };
  }
  const candidates=Object.entries(tree).map(([op,x]:any)=>({...x,operator:String(op)}));
  const usable=candidates.filter(x=>Number(x?.count||0)>0&&Number.isFinite(Number(x?.cost)));
  const list=(usable.length?usable:candidates).filter(x=>Number.isFinite(Number(x?.cost)));
  if(!list.length)return {cost:0,count:0,rate:0,operator:"any"};
  list.sort((a,b)=>Number(a.cost)-Number(b.cost));
  const x=list[0];
  return {cost:Number(x.cost||0),count:Number(x.count||0),rate:Number(x.rate||0),operator:"any"};
}

function bestOperator(productTree:any){return quoteForOperator(productTree,"any")}

export async function getPrice(country:string,service:string,operator="any"){
  const safeCountry=await resolvePublicCountry(country);
  const safeService=await resolvePublicService(service);
  const raw=await guest("/v1/guest/prices?country="+encodeURIComponent(safeCountry)+"&product="+encodeURIComponent(safeService));

  // 5SIM's new protocol can return the filtered tree as:
  // { product: { country: { operator: { cost, count, rate } } } }
  // or, depending on the endpoint response, { country: { product: { ... } } }.
  // Never pass the whole product tree to bestOperator: that could select
  // the cheapest operator from a DIFFERENT country and make maxPrice fail.
  const byProduct=raw?.[safeService];
  const root=
    byProduct?.[safeCountry] ||
    byProduct?.[String(safeCountry).toLowerCase()] ||
    raw?.[safeCountry]?.[safeService] ||
    raw?.[String(safeCountry).toLowerCase()]?.[safeService] ||
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
  const productTree=(raw as any)?.[service] || (raw as any)?.[String(service).toLowerCase()] || null;

  // Support both protocol response layouts. A filtered response normally uses
  // product -> country -> operator, but some responses are country -> product
  // -> operator. Keep country IDs canonical so the UI can match the catalog.
  const countryTrees:Array<[string,any]>=[];
  if(productTree&&typeof productTree==="object"&&!Array.isArray(productTree)){
    countryTrees.push(...Object.entries(productTree) as [string,any][]);
  }else{
    const known=new Set(countries.map(c=>String(c.id).toLowerCase()));
    for(const [country,tree] of Object.entries(raw||{}) as [string,any][]){
      if(!tree||typeof tree!=="object"||Array.isArray(tree))continue;
      const nested=tree[service]||tree[String(service).toLowerCase()];
      if(nested&&typeof nested==="object"){
        countryTrees.push([country,nested]);
      }else if(known.has(String(country).toLowerCase())){
        // Some APIs omit the product wrapper in a filtered response.
        countryTrees.push([country,tree]);
      }
    }
  }

  for(const [country,countryTree] of countryTrees){
    const p=bestOperator(countryTree);
    const match=countries.find(c=>String(c.id).toLowerCase()===String(country).toLowerCase());
    const id=String(match?.id||country);
    out[id]=p;
  }
  pricesCache.set(cacheKey,{at:Date.now(),value:out});
  return out;
}

export async function purchase(country:string,service:string,maxPrice?:number,operator="any"){
  const safeCountry=await resolvePublicCountry(country);
  const safeService=await resolvePublicService(service);
  const selectedOperator=String(operator||"any").trim().toLowerCase()||"any";

  // Read the live quote immediately before purchase. The quote is used as a
  // safety ceiling, not as a stale price that must be sent to 5SIM.
  const fresh=await getPrice(safeCountry,safeService,selectedOperator);
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
    +encodeURIComponent(safeCountry)+"/"
    +encodeURIComponent(selectedOperator)+"/"
    +encodeURIComponent(safeService);

  let p:any;
  try{
    // maxPrice is now safe because getPrice(any) uses 5SIM's explicit any quote.
    const buyPath=selectedOperator==="any" && quoteCeiling>0
      ? path+"?maxPrice="+encodeURIComponent(String(quoteCeiling))
      : path;
    p=await user(buyPath);
  }catch(first){
    const msg=first instanceof Error?first.message:String(first);
    // A single retry is allowed only for a transient provider stock race.
    if(!/no free phones|price|maxprice|stock|temporarily unavailable/i.test(msg))throw first;
    const retryQuote=await getPrice(safeCountry,safeService,selectedOperator);
    if(!retryQuote.count||!retryQuote.cost)throw new Error("NO_FREE_PHONES");
    p=await user(selectedOperator==="any" && Number(retryQuote.cost)>0
      ? path+"?maxPrice="+encodeURIComponent(String(retryQuote.cost))
      : path);
  }

  // 5SIM's documented New Protocol response is a top-level activation
  // object (id, phone, operator, product, price, status, expires). Some
  // gateways/proxies can wrap the same object in data/activation/result,
  // so normalize those envelopes before deciding that the purchase failed.
  function findActivation(value:any, depth=0):any{
    if(!value||depth>4)return null;
    if(Array.isArray(value)){
      for(const item of value){
        const hit=findActivation(item,depth+1);
        if(hit)return hit;
      }
      return null;
    }
    if(typeof value!=="object")return null;
    const hasId=value.id!=null||value.order_id!=null||value.orderId!=null;
    const hasPhone=value.phone!=null||value.number!=null||value.phoneNumber!=null;
    if(hasId&&hasPhone)return value;
    for(const k of ["data","activation","result","order"]){
      if(value[k]){
        const hit=findActivation(value[k],depth+1);
        if(hit)return hit;
      }
    }
    return null;
  }

  const activation=findActivation(p);
  const activationId=activation?.id??activation?.order_id??activation?.orderId??p?.id??p?.order_id??p?.orderId;
  const activationPhone=activation?.phone??activation?.number??activation?.phoneNumber??p?.phone??p?.number??p?.phoneNumber;
  if(activationId==null||!activationPhone){
    console.error("[5SIM BUY RESPONSE]",{
      type:Array.isArray(p)?"array":typeof p,
      keys:p&&typeof p==="object"?Object.keys(p):[],
      body:p
    });
    throw new Error("5SIM did not return an activation number.");
  }

  const providerCost=Number(activation?.price??p?.price??fresh.cost);
  if(!Number.isFinite(providerCost)||providerCost<=0){
    throw new Error("5SIM returned an invalid purchase price.");
  }

  // Never let a stale price make Numelixa undercharge. If 5SIM returns a
  // higher price than our approved ceiling, cancel the activation immediately.
  if(Number.isFinite(quoteCeiling)&&quoteCeiling>0&&providerCost>quoteCeiling){
    try{await cancel(String(activationId))}catch{}
    throw new Error("PRICE_CHANGED");
  }

  const expiresAt=activation?.expires?new Date(activation.expires):null;
  return {
    success:1,
    order_id:String(activationId),
    number:String(activationPhone),
    country:String(activation?.country||p?.country||safeCountry),
    service:String(activation?.product||p?.product||safeService),
    expires_in:expiresAt
      ? Math.max(0,Math.floor((expiresAt.getTime()-Date.now())/1000))
      :600,
    expires_at:expiresAt?.toISOString()||null,
    operator:String(activation?.operator||p?.operator||selectedOperator),
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
