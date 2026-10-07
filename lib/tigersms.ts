const BASE="https://api.tiger-sms.com/stubs/handler_api.php";
const key=()=>String(process.env.TIGER_SMS_API_KEY||process.env.TIGERSMS_API_KEY||"").trim();
const TTL=5*60*1000;
let countriesCache:{at:number;value:any[]}|null=null;
let servicesCache:{at:number;value:any[]}|null=null;
function configured(){return !!key()}
export function providerConfigured(){return configured()}
function humanize(v:string){return String(v||"").replace(/[_-]+/g," ").replace(/\b\w/g,c=>c.toUpperCase())}
async function request(action:string,params:Record<string,string>={}){
 if(!key())throw new Error("TIGER_SMS_API_KEY is not configured.");
 const q=new URLSearchParams({action,api_key:key(),...params});
 const r=await fetch(BASE+"?"+q.toString(),{cache:"no-store",headers:{"Accept":"application/json","User-Agent":"Numelixa/1.0"}});
 const text=await r.text();
 if(!r.ok)throw new Error("Tiger SMS HTTP "+r.status+": "+text.slice(0,300));
 if(text.startsWith("NO_")||text.startsWith("BAD_")||text.startsWith("ERROR")||text.startsWith("WRONG_"))throw new Error("Tiger SMS "+text.trim());
 try{return JSON.parse(text)}catch{return text}
}
export async function balance(){const p=await request("getBalance",{format:"json"});return Number(p?.balance??(String(p).match(/([0-9.]+)/)?.[1]||0))}
export async function listCountries(){
 if(countriesCache&&Date.now()-countriesCache.at<TTL)return countriesCache.value;
 const raw=await request("getCountries");
 const arr=Array.isArray(raw)?raw:[];
 const out=arr.map((c:any)=>({id:String(c.id),code:String(c.id),name:String(c.eng||c.name||c.rus||c.id),short_name:String(c.eng||c.name||c.id),iso:"",prefix:""}));
 countriesCache={at:Date.now(),value:out};return out;
}
export async function listServices(){
 if(servicesCache&&Date.now()-servicesCache.at<TTL)return servicesCache.value;
 const raw=await request("getServicesList");
 const arr=Array.isArray(raw?.services)?raw.services:[];
 const out=arr.map((s:any)=>({id:String(s.code),code:String(s.code),name:String(s.name||humanize(s.code))}));
 servicesCache={at:Date.now(),value:out};return out;
}
export async function servicePrices(service:string,countries:any[]=[]){
 const raw=await request("getPricesV3",{service});
 const out:Record<string,{cost:number;count:number;rate:number}>={};
 for(const [country,tree] of Object.entries(raw||{}) as any[]){
  const p=tree?.[service]; if(!p)continue;
  out[String(country)]={cost:Number(p.price||p.saleAveragePrice||0),count:Number(p.count||0),rate:100};
 }
 return out;
}
export async function getPrice(country:string,service:string,_operator="any"){
 const raw=await request("getPricesV3",{service,country});
 const p=raw?.[String(country)]?.[String(service)];
 return {cost:Number(p?.price??p?.saleAveragePrice??0),count:Number(p?.count||0),rate:100,operator:"any"};
}
export async function purchase(country:string,service:string,maxPrice?:number,_operator="any"){
 const q=await getPrice(country,service);
 if(!q.count||!q.cost)throw new Error("NO_FREE_PHONES");
 const ceiling=Number(maxPrice||q.cost);
 const p=await request("getNumberV2",{service,country,maxPrice:String(ceiling)});
 const id=String(p?.activationId||""); const number=String(p?.phoneNumber||"");
 if(!id||!number)throw new Error("Tiger SMS did not return an activation number.");
 const cost=Number(p?.activationCost??q.cost);
 if(cost>ceiling){try{await cancel(id)}catch{};throw new Error("PRICE_CHANGED")}
 return {success:1,order_id:id,number,country:String(p?.countryCode??country),service:String(p?.serviceCode??service),expires_in:p?.activationEndTime?Math.max(0,Math.floor((new Date(p.activationEndTime).getTime()-Date.now())/1000)):1200,expires_at:p?.activationEndTime||null,operator:"any",providerCost:cost};
}
export async function check(orderid:string){
 const p=await request("getStatusV2",{id:orderid});
 if(p?.sms?.code||p?.sms?.text)return {status:3,sms:String(p.sms.code||p.sms.text),fullSms:String(p.sms.text||p.sms.code),providerStatus:"OK"};
 const raw=await request("getStatus",{id:orderid});
 const s=String(raw||"");
 if(s.startsWith("STATUS_OK:")){const code=s.split(":")[1]||"";return {status:3,sms:code,fullSms:code,providerStatus:"OK"}}
 if(s==="STATUS_CANCEL"||s==="NO_ACTIVATION")return {status:6,sms:"",providerStatus:s};
 return {status:1,sms:"",providerStatus:s};
}
export async function finalize(orderid:string){return request("setStatusV2",{id:orderid,status:"6"})}
export async function cancel(orderid:string){return request("setStatusV2",{id:orderid,status:"8"})}
