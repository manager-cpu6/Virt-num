import crypto from "crypto";
const base=process.env.SMSPOOL_BASE_URL||"https://api.smspool.net";const key=process.env.SMSPOOL_API_KEY;
async function req(path:string,data:Record<string,string|number>={},method:"POST"|"GET"="POST"){
 if(!key)throw new Error("SMSPool API is not configured");
 const r=await fetch(base+path,{method,headers:{"Content-Type":"application/x-www-form-urlencoded"},body:method==="POST"?new URLSearchParams(Object.entries({key,...data}).map(([k,v])=>[k,String(v)])):undefined,cache:"no-store"});
 const j=await r.json();if(!r.ok)throw new Error(j?.message||`SMSPool HTTP ${r.status}`);return j;
}
export function providerConfigured(){return !!key}
export async function listCountries(){return req("/country/retrieve_all",{}, "GET")}
export async function listServices(){return req("/service/retrieve_all",{}, "GET")}
export async function stock(country:string,service:string){return req("/sms/stock",{country,service})}
export async function purchase(country:string,service:string){return req("/purchase/sms",{country,service})}
export async function check(orderid:string){return req("/sms/check",{orderid})}
export async function cancel(orderid:string){return req("/sms/cancel",{orderid})}
export async function balance(){return req("/request/balance")}
export function normalizeList(raw:any,key:string){const v=Array.isArray(raw)?raw:(raw?.[key]||raw?.result||raw?.data||[]);return Array.isArray(v)?v:[]}
