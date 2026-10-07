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

function countryIso(name:string){
 const n=String(name||"").trim().toLowerCase();
 const map:Record<string,string>={
  "united states":"US","usa":"US","united kingdom":"GB","great britain":"GB","canada":"CA","australia":"AU",
  "germany":"DE","france":"FR","italy":"IT","spain":"ES","netherlands":"NL","belgium":"BE","sweden":"SE",
  "norway":"NO","denmark":"DK","finland":"FI","poland":"PL","portugal":"PT","switzerland":"CH","austria":"AT",
  "ireland":"IE","romania":"RO","greece":"GR","czech republic":"CZ","czechia":"CZ","hungary":"HU",
  "brazil":"BR","argentina":"AR","mexico":"MX","colombia":"CO","chile":"CL","peru":"PE",
  "south africa":"ZA","nigeria":"NG","ghana":"GH","kenya":"KE","uganda":"UG","tanzania":"TZ","ethiopia":"ET",
  "somalia":"SO","egypt":"EG","morocco":"MA","algeria":"DZ","tunisia":"TN","rwanda":"RW","cameroon":"CM",
  "india":"IN","pakistan":"PK","bangladesh":"BD","indonesia":"ID","malaysia":"MY","philippines":"PH",
  "vietnam":"VN","thailand":"TH","japan":"JP","south korea":"KR","china":"CN","turkey":"TR","israel":"IL",
  "ukraine":"UA","kazakhstan":"KZ","uzbekistan":"UZ"
 };
 return map[n]||"";
}

export async function balance(){
 const p=await request("getBalance",{format:"json"});
 return Number(p?.balance??(String(p).match(/([0-9.]+)/)?.[1]||0))
}

export async function listCountries(){
 if(countriesCache&&Date.now()-countriesCache.at<TTL)return countriesCache.value;
 const raw=await request("getCountries");
 const arr=Array.isArray(raw)?raw:[];
 const out=arr.map((c:any)=>{
  const name=String(c.eng||c.name||c.rus||c.id);
  return {id:String(c.id),code:String(c.id),name,short_name:name,iso:countryIso(name),prefix:""};
 }).filter((c:any)=>c.id&&c.name);
 countriesCache={at:Date.now(),value:out};
 return out;
}

export async function listServices(){
 if(servicesCache&&Date.now()-servicesCache.at<TTL)return servicesCache.value;
 const raw=await request("getServicesList");
 const arr=Array.isArray(raw?.services)?raw.services:[];
 const out=arr.map((s:any)=>({id:String(s.code),code:String(s.code),name:String(s.name||humanize(s.code))}))
   .filter((s:any)=>s.id&&s.name);
 servicesCache={at:Date.now(),value:out};
 return out;
}

function parsePriceTree(raw:any,service:string){
 const out:Record<string,{cost:number;count:number;rate:number}>={};
 const add=(country:any,node:any)=>{
  const p=node?.[service]??node;
  if(!p||typeof p!=="object")return;
  const cost=Number(p.cost??p.price??p.saleAveragePrice??0);
  const count=Number(p.count??p.numbersCount??p.numberCount??0);
  if(cost>0||count>0)out[String(country)]={cost,count,rate:100};
 };
 for(const [country,node] of Object.entries(raw||{}) as any[]){
  if(node&&typeof node==="object"&&service in node)add(country,node);
  else if(Array.isArray(node)&&node.length)for(const item of node as any[])add(item?.countryCode??country,item);
 }
 if(Array.isArray(raw))for(const item of raw as any[])add(item?.countryCode,item);
 return out;
}

export async function servicePrices(service:string,_countries:any[]=[]){
 try{
  const raw=await request("getPricesV3",{service});
  const parsed=parsePriceTree(raw,service);
  if(Object.keys(parsed).length)return parsed;
 }catch{}
 const raw=await request("getPrices",{service});
 return parsePriceTree(raw,service);
}

export async function getPrice(country:string,service:string,_operator="any"){
 try{
  const raw=await request("getPricesV3",{service,country});
  const parsed=parsePriceTree(raw,service)[String(country)];
  if(parsed)return {...parsed,operator:"any"};
 }catch{}
 const raw=await request("getPrices",{service,country});
 const parsed=parsePriceTree(raw,service)[String(country)];
 return {...(parsed||{cost:0,count:0,rate:100}),operator:"any"};
}

export async function purchase(country:string,service:string,maxPrice?:number,_operator="any"){
 const q=await getPrice(country,service);
 if(!q.count||!q.cost)throw new Error("NO_FREE_PHONES");
 const ceiling=Number(maxPrice||q.cost);
 const p=await request("getNumberV2",{service,country,maxPrice:String(ceiling)});
 const id=String(p?.activationId||"");
 const number=String(p?.phoneNumber||"");
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
