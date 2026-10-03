const base="https://api.sms-activate.ae/stubs/handler_api.php";
const key=process.env.SMSACTIVATE_API_KEY?.trim();
const TTL=5*60*1000;
let countriesCache:{at:number;items:any[]}|null=null;
let servicesCache:{at:number;items:any[]}|null=null;

function configured(){return !!key}
export function providerConfigured(){return configured()}

async function call(action:string,params:Record<string,string|number|boolean>={},expectJson=false){
 if(!key)throw new Error("SMS-Activate API is not configured. Add SMSACTIVATE_API_KEY in Vercel Production.");
 const qs=new URLSearchParams({api_key:key,action});
 for(const [k,v] of Object.entries(params))qs.set(k,String(v));
 let r:Response|null=null,lastError:unknown=null;
 for(let attempt=0;attempt<2;attempt++){
  const controller=new AbortController();
  const timer=setTimeout(()=>controller.abort(),12000);
  try{
   r=await fetch(base+"?"+qs.toString(),{cache:"no-store",headers:{Accept:"application/json,text/plain","User-Agent":"Numelixa/2.1"},signal:controller.signal});
   clearTimeout(timer);
   if(r.ok||r.status<500)break;
  }catch(e){
   clearTimeout(timer);
   lastError=e;
   if(attempt===0)await new Promise(resolve=>setTimeout(resolve,350));
  }
 }
 if(!r){const msg=lastError instanceof Error?lastError.message:"Network request failed";throw new Error("SMS-Activate connection failed: "+msg)}
 const text=await r.text();
 let body:any=text;try{body=JSON.parse(text)}catch{}
 if(!r.ok)throw new Error("SMS-Activate HTTP "+r.status);
 if(typeof body==="string"&&(body==="BAD_KEY"||body==="BAD_ACTION"||body.startsWith("NO_")||body.startsWith("ERROR")||body.startsWith("WRONG_")||body.startsWith("EARLY_")||body.startsWith("NO_BALANCE")))throw new Error(body);
 return expectJson&&typeof body==="string"?JSON.parse(body):body;
}

function objectArray(raw:any,key?:string){const v=key?raw?.[key]:raw;if(Array.isArray(v))return v;if(v&&typeof v==="object")return Object.entries(v).map(([k,val]:any)=>val&&typeof val==="object"?{id:k,...val}:{id:k,value:val});return[]}
export async function balance(){const v=await call("getBalance");const s=String(v);return Number(s.includes(":")?s.split(":")[1]:s)}
export async function listCountries(){
 if(countriesCache&&Date.now()-countriesCache.at<TTL)return countriesCache.items;
 const raw=await call("getCountries",{},true);
 const items=Object.entries(raw||{}).map(([name,v]:any)=>({id:String(v?.id??name),name:String(v?.eng||name),code:String(v?.id??name),short_name:String(v?.eng||name),retry:Number(v?.retry||0),visible:Number(v?.visible??1),rent:Number(v?.rent||0)})).filter((x:any)=>x.visible!==0);
 countriesCache={at:Date.now(),items};return items;
}
export async function listServices(country?:string){
 const raw=await call("getServicesList",{...(country?{country}:{}),lang:"en"},true);
 const items=objectArray(raw,"services").map((x:any)=>({id:String(x.code??x.id),code:String(x.code??x.id),name:String(x.name??x.code??x.id)}));
 servicesCache={at:Date.now(),items};return items;
}
export async function getPrice(country:string,service:string){
 const raw=await call("getPrices",{country,service},true);
 const countryObj=raw?.[country]||raw?.[String(country)]||Object.values(raw||{})[0]||{};
 const serviceObj=countryObj?.[service]||Object.values(countryObj||{})[0];
 if(!serviceObj)return {cost:0,count:0,physicalCount:0};
 return {cost:Number(serviceObj.cost||0),count:Number(serviceObj.count||0),physicalCount:Number(serviceObj.physicalCount||0)};
}
export async function stock(country:string,service:string){return getPrice(country,service)}
export async function servicePrices(service:string){
 const raw=await call("getPrices",{service},true);
 const out:Record<string,{cost:number;count:number;physicalCount:number}>={};
 for(const [countryId,countryData] of Object.entries(raw||{})){
  const item=(countryData as any)?.[service];
  if(item)out[String(countryId)]={cost:Number(item.cost||0),count:Number(item.count||0),physicalCount:Number(item.physicalCount||0)};
 }
 return out;
}
export async function purchase(country:string,service:string,maxPrice?:number){
 const v=await call("getNumber",{country,service,...(Number.isFinite(maxPrice)?{maxPrice}: {})});
 const s=String(v);
 const m=s.match(/^ACCESS_NUMBER:(\d+):(.*)$/);
 if(!m)throw new Error(s);
 return {success:1,order_id:m[1],number:m[2],country,service,expires_in:600};
}
export async function check(orderid:string){
 const v=await call("getStatus",{id:orderid});
 const s=String(v);
 if(s.startsWith("STATUS_OK:"))return {status:3,sms:s.slice("STATUS_OK:".length)};
 if(s==="STATUS_WAIT_CODE"||s==="STATUS_WAIT_RESEND")return {status:1,sms:"",time_left:null};
 if(s==="STATUS_CANCEL"||s==="STATUS_CANCEL_WAIT")return {status:6,sms:""};
 if(s==="STATUS_WAIT_RETRY")return {status:1,sms:""};
 return {status:1,sms:"",raw:s};
}
export async function finalize(orderid:string){const v=await call("setStatus",{id:orderid,status:6});return String(v)}
export async function cancel(orderid:string){
 const v=await call("setStatus",{id:orderid,status:8});
 const s=String(v);
 if(s!=="ACCESS_CANCEL"&&s!=="ACCESS_READY"&&!s.startsWith("ACCESS_"))throw new Error(s);
 return {success:1,status:6,raw:s};
}
export const APP_SERVICES=[
["wa","WhatsApp","◉"],["tg","Telegram","✈"],["go","Google","G"],["fb","Facebook","f"],["ig","Instagram","◎"],["lf","TikTok","♪"],["sn","Snapchat","◆"],["tw","X / Twitter","𝕏"],["vi","Viber","V"],["ds","Discord","◌"],["am","Amazon","a"],["ms","Microsoft","⊞"],["apple","Apple","●"],["sg","Signal","S"],["wb","WeChat","W"],["ym","Yahoo","Y"],["ot","Other","＋"]
].map(([id,name,icon])=>({id,name,icon}));
export function normalizeList(raw:any,key:string){return objectArray(raw,key)}
