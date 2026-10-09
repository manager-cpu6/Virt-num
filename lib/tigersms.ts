const BASE="https://api.tiger-sms.com/stubs/handler_api.php";
const key=()=>String(process.env.TIGER_SMS_API_KEY||process.env.TIGERSMS_API_KEY||"").trim();
const TTL=5*60*1000;
let countriesCache:{at:number;value:any[]}|null=null;
let servicesCache:{at:number;value:any[]}|null=null;

function configured(){return !!key()}
export function providerConfigured(){return configured()}
function humanize(v:string){return String(v||"").replace(/[_-]+/g," ").replace(/\b\w/g,c=>c.toUpperCase())}

async function request(action:string,params:Record<string,string>={}){
 const apiKey=key();
 if(!apiKey)throw new Error("TIGER_SMS_API_KEY is not configured.");
 const q=new URLSearchParams({action,api_key:apiKey,...params});
 const r=await fetch(BASE+"?"+q.toString(),{cache:"no-store",headers:{"Accept":"application/json","User-Agent":"Numelixa/1.0"}});
 const text=(await r.text()).trim();
 let parsed:any=text;
 try{parsed=JSON.parse(text)}catch{}
 const nestedError=parsed&&typeof parsed==="object"?(parsed.error??parsed.errors??parsed.message??parsed.errorMessage??parsed.error_code??parsed.errorCode):null;
 const status=String(parsed&&typeof parsed==="object"?(parsed.status??""):"").toLowerCase();
 const failedEnvelope=!!(parsed&&typeof parsed==="object"&&(status==="error"||parsed.success===false||parsed.ok===false||parsed.error||parsed.errors||parsed.errorCode||parsed.error_code));
 if(!r.ok||failedEnvelope||typeof parsed==="string"&&/^(NO_|BAD_|ERROR|WRONG_|ACCESS_ERROR|AUTH_ERROR)/i.test(parsed)){
  const detail=typeof nestedError==="string"?nestedError:nestedError&&typeof nestedError==="object"?JSON.stringify(nestedError):typeof parsed==="string"?parsed:JSON.stringify(parsed);
  throw new Error("Tiger SMS "+(r.ok?"API error":"HTTP "+r.status)+": "+String(detail||text||"Unknown upstream error").slice(0,300));
 }
 return parsed;
}

function countryIso(name:string){
 const n=String(name||"").trim().toLowerCase().replace(/[’']/g,"").replace(/\s+/g," ");
 const map:Record<string,string>={"afghanistan":"AF","albania":"AL","algeria":"DZ","andorra":"AD","angola":"AO","anguilla":"AI","antigua and barbuda":"AG","argentina":"AR","armenia":"AM","aruba":"AW","australia":"AU","austria":"AT","azerbaijan":"AZ","bahamas":"BS","bahrain":"BH","bangladesh":"BD","barbados":"BB","belarus":"BY","belgium":"BE","belize":"BZ","benin":"BJ","bermuda":"BM","bhutan":"BT","bolivia":"BO","bosnia and herzegovina":"BA","botswana":"BW","brazil":"BR","brunei":"BN","bulgaria":"BG","burkina faso":"BF","burundi":"BI","cambodia":"KH","cameroon":"CM","canada":"CA","cape verde":"CV","central african republic":"CF","chad":"TD","chile":"CL","china":"CN","colombia":"CO","comoros":"KM","congo":"CG","costa rica":"CR","croatia":"HR","cuba":"CU","curacao":"CW","cyprus":"CY","czech republic":"CZ","czechia":"CZ","denmark":"DK","djibouti":"DJ","dominica":"DM","dominican republic":"DO","ecuador":"EC","egypt":"EG","el salvador":"SV","equatorial guinea":"GQ","eritrea":"ER","estonia":"EE","eswatini":"SZ","ethiopia":"ET","fiji":"FJ","finland":"FI","france":"FR","gabon":"GA","gambia":"GM","georgia":"GE","germany":"DE","ghana":"GH","gibraltar":"GI","greece":"GR","greenland":"GL","grenada":"GD","guatemala":"GT","guinea":"GN","guinea bissau":"GW","guyana":"GY","haiti":"HT","honduras":"HN","hong kong":"HK","hungary":"HU","iceland":"IS","india":"IN","indonesia":"ID","iran":"IR","iraq":"IQ","ireland":"IE","israel":"IL","italy":"IT","ivory coast":"CI","cote d'ivoire":"CI","jamaica":"JM","japan":"JP","jordan":"JO","kazakhstan":"KZ","kenya":"KE","kuwait":"KW","kyrgyzstan":"KG","laos":"LA","latvia":"LV","lebanon":"LB","lesotho":"LS","liberia":"LR","libya":"LY","liechtenstein":"LI","lithuania":"LT","luxembourg":"LU","macau":"MO","madagascar":"MG","malawi":"MW","malaysia":"MY","maldives":"MV","mali":"ML","malta":"MT","mauritania":"MR","mauritius":"MU","mexico":"MX","moldova":"MD","monaco":"MC","mongolia":"MN","montenegro":"ME","morocco":"MA","mozambique":"MZ","myanmar":"MM","namibia":"NA","nepal":"NP","netherlands":"NL","new zealand":"NZ","nicaragua":"NI","niger":"NE","nigeria":"NG","north macedonia":"MK","norway":"NO","oman":"OM","pakistan":"PK","palestine":"PS","panama":"PA","papua new guinea":"PG","paraguay":"PY","peru":"PE","philippines":"PH","poland":"PL","portugal":"PT","puerto rico":"PR","qatar":"QA","romania":"RO","russia":"RU","rwanda":"RW","saudi arabia":"SA","senegal":"SN","serbia":"RS","seychelles":"SC","sierra leone":"SL","singapore":"SG","slovakia":"SK","slovenia":"SI","somalia":"SO","south africa":"ZA","south korea":"KR","south sudan":"SS","spain":"ES","sri lanka":"LK","sudan":"SD","suriname":"SR","sweden":"SE","switzerland":"CH","syria":"SY","taiwan":"TW","tajikistan":"TJ","tanzania":"TZ","thailand":"TH","togo":"TG","trinidad and tobago":"TT","tunisia":"TN","turkey":"TR","turkmenistan":"TM","uganda":"UG","ukraine":"UA","united arab emirates":"AE","united kingdom":"GB","united states":"US","usa":"US","uruguay":"UY","uzbekistan":"UZ","venezuela":"VE","vietnam":"VN","yemen":"YE","zambia":"ZM","zimbabwe":"ZW"};
 return map[n]||"";
}

export async function balance(){
 // The documented default response is plain text: ACCESS_BALANCE:12.3400.
 // Prefer it because it is stable across Tiger account/API versions, then fall
 // back to the optional JSON response if the plain-text request fails.
 const parseBalance=(p:any):number=>{
  const candidate=p&&typeof p==="object"?(p.balance??p.data?.balance??p.result?.balance??p.data?.data?.balance):null;
  if(candidate!==null&&candidate!==undefined){
   const n=Number(candidate);
   if(Number.isFinite(n)&&n>=0)return n;
  }
  const raw=String(p??"").trim();
  const match=raw.match(/(?:ACCESS_BALANCE\s*:\s*)?(-?\d+(?:\.\d+)?)/i);
  if(match){
   const n=Number(match[1]);
   if(Number.isFinite(n)&&n>=0)return n;
  }
  throw new Error("Tiger SMS returned an unreadable balance response: "+raw.slice(0,160));
 };
 try{return parseBalance(await request("getBalance"))}
 catch(plainError){
  try{return parseBalance(await request("getBalance",{format:"json"}))}
  catch(jsonError){
   throw new Error("Tiger SMS balance request failed. "+(jsonError instanceof Error?jsonError.message:plainError instanceof Error?plainError.message:"Unknown response"));
  }
 }
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
 const friendly:Record<string,string>={wa:"WhatsApp",whatsapp:"WhatsApp",tg:"Telegram",go:"Google",fb:"Facebook",ig:"Instagram",tt:"TikTok",tw:"X / Twitter",mm:"Microsoft",oi:"OpenAI",am:"Amazon",ap:"Apple",vi:"Viber",ds:"Discord",sn:"Snapchat",ya:"Yahoo",ok:"OK",ub:"Uber"};
 const out=arr.map((s:any)=>{const id=String(s.code||"").toLowerCase();return {id:String(s.code),code:String(s.code),name:friendly[id]||String(s.name||humanize(s.code))}})
   .filter((s:any)=>s.id&&s.name);
 servicesCache={at:Date.now(),value:out};
 return out;
}

function parsePriceTree(raw:any,service:string){
 const out:Record<string,{cost:number;count:number;rate:number}>={};
 const add=(country:any,node:any)=>{
  const p=node?.[service]??node;
  if(!p||typeof p!=="object")return;
  // getPricesV3's `price` is Tiger's dynamic recommended max price;
  // getPrices V1's `cost` is the legacy recommended max price. Prefer V3
  // price over cost/saleAveragePrice when both are present.
  const cost=Number(p.price??p.cost??p.saleAveragePrice??0);
  const count=Number(p.count??p.numbersCount??p.numberCount??0);
  if(Number.isFinite(cost)&&cost>0&&Number.isFinite(count)&&count>=0)out[String(country)]={cost,count,rate:100};
 };
 for(const [country,node] of Object.entries(raw||{}) as any[]){
  if(node&&typeof node==="object"&&service in node)add(country,node);
  else if(Array.isArray(node)&&node.length)for(const item of node as any[])add(item?.countryCode??country,item);
 }
 if(Array.isArray(raw))for(const item of raw as any[])add(item?.countryCode,item);
 return out;
}

export async function servicePrices(service:string,countries:any[]=[]){
 let parsed:Record<string,{cost:number;count:number;rate:number}>={};
 try{
  const raw=await request("getPricesV3",{service});
  parsed=parsePriceTree(raw,service);
 }catch{}
 if(!Object.keys(parsed).length){
  try{
   const raw=await request("getPrices",{service});
   parsed=parsePriceTree(raw,service);
  }catch{}
 }
 // Tiger's stock-count endpoint is the authoritative list of country IDs that
 // currently have inventory. Merge its counts without discarding live prices.
 try{
  const stock=await request("getServiceNumbersCount",{service});
  if(Array.isArray(stock)){
   for(const item of stock){
    const id=String(item?.countryCode??item?.country_id??item?.id??"");
    const count=Number(item?.numbersCount??item?.count??0);
    if(!id||count<=0)continue;
    const existing=parsed[id];
    if(existing)parsed[id]={...existing,count};
   }
  }
 }catch{}
 // Keep catalog keys in the provider's own numeric-ID namespace. Do not map
 // display names to IDs here; Tiger requires numeric country codes at purchase.
 return parsed;
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
 // maxPrice from the checkout quote can be stale if Tiger's offer floor moves.
 // Always start at the live Tiger quote and retry once at the explicit min
 // price returned in WRONG_MAX_PRICE.details/info.min.
 let ceiling=Math.max(Number(q.cost)||0,Number(maxPrice)||0);
 if(!Number.isFinite(ceiling)||ceiling<=0)throw new Error("Tiger SMS returned an invalid purchase price.");
 const buy=()=>request("getNumberV2",{service,country,maxPrice:ceiling.toFixed(4)});
 let p:any;
 try{
  p=await buy();
 }catch(error){
  const message=error instanceof Error?error.message:String(error);
  const parsedMin=message.match(/(?:\\"min\\"|\\bmin\\b)\\s*[:=]\\s*([0-9]+(?:\\.[0-9]+)?)/i);
  const minPrice=parsedMin?Number(parsedMin[1]):NaN;
  if(/WRONG_MAX_PRICE/i.test(message)&&Number.isFinite(minPrice)&&minPrice>ceiling){
   ceiling=minPrice;
   try{p=await buy()}catch(retryError){
    const retryMessage=retryError instanceof Error?retryError.message:String(retryError);
    if(/NO_NUMBERS|NO_FREE_PHONES/i.test(retryMessage))throw new Error("NO_FREE_PHONES");
    if(/NO_BALANCE/i.test(retryMessage))throw new Error("PROVIDER_BALANCE_TOO_LOW");
    if(/BAD_COUNTRY/i.test(retryMessage))throw new Error("BAD_COUNTRY");
    if(/BAD_SERVICE/i.test(retryMessage))throw new Error("BAD_SERVICE");
    throw retryError;
   }
  }else{
   if(/NO_NUMBERS|NO_FREE_PHONES/i.test(message))throw new Error("NO_FREE_PHONES");
   if(/NO_BALANCE/i.test(message))throw new Error("PROVIDER_BALANCE_TOO_LOW");
   if(/BAD_COUNTRY/i.test(message))throw new Error("BAD_COUNTRY");
   if(/BAD_SERVICE/i.test(message))throw new Error("BAD_SERVICE");
   throw error;
  }
 }
 const payload=p?.data??p?.activation??p?.result??p;
 if(p?.success===false||String(p?.status||"").toLowerCase()==="error"||p?.error||p?.errorCode){
  const errorCode=String(p?.errorCode??p?.error_code??p?.error?.code??p?.code??"");
  if(/NO_NUMBERS|NO_FREE_PHONES/i.test(errorCode))throw new Error("NO_FREE_PHONES");
  if(/NO_BALANCE/i.test(errorCode))throw new Error("PROVIDER_BALANCE_TOO_LOW");
  throw new Error("Tiger SMS purchase failed: "+String(p?.error?.message??p?.message??errorCode??"Unknown provider error"));
 }
 const id=String(payload?.activationId??payload?.id??payload?.activation_id??"");
 const number=String(payload?.phoneNumber??payload?.phone??payload?.number??"");
 if(!id||!number)throw new Error("Tiger SMS did not return an activation number.");
 const cost=Number(payload?.activationCost??payload?.cost??q.cost);
 if(cost>ceiling){try{await cancel(id)}catch{};throw new Error("PRICE_CHANGED")}
 const end=payload?.activationEndTime??payload?.expiresAt??payload?.expires_at??null;
 return {success:1,order_id:id,number,country:String(payload?.countryCode??country),service:String(payload?.serviceCode??service),expires_in:end?Math.max(0,Math.floor((new Date(end).getTime()-Date.now())/1000)):1200,expires_at:end,operator:"any",providerCost:cost};
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
