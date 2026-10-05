import {paypalBaseUrl,getPaymentSettings} from "@/lib/payment-settings";
export async function paypalAccessToken(){
  const s=await getPaymentSettings();
  if(!s.paypal.clientId||!s.paypal.secretKey)throw new Error("PAYPAL_NOT_CONFIGURED");
  const basic=Buffer.from(s.paypal.clientId+":"+s.paypal.secretKey).toString("base64");
  const r=await fetch(paypalBaseUrl()+"/v1/oauth2/token",{method:"POST",headers:{Authorization:"Basic "+basic,"Content-Type":"application/x-www-form-urlencoded","Accept":"application/json"},body:"grant_type=client_credentials",cache:"no-store"});
  const d:any=await r.json().catch(()=>null);
  if(!r.ok||!d?.access_token){console.error("[PAYPAL AUTH]",r.status,d);throw new Error("PAYPAL_AUTH_FAILED");}
  return String(d.access_token);
}
export async function paypalApi(path:string,options:RequestInit={}){
  const token=await paypalAccessToken();
  const headers=new Headers(options.headers||{});
  headers.set("Authorization","Bearer "+token);headers.set("Content-Type","application/json");headers.set("Accept","application/json");
  const r=await fetch(paypalBaseUrl()+path,{...options,headers,cache:"no-store"});
  const d:any=await r.json().catch(()=>null);
  if(!r.ok){console.error("[PAYPAL API]",path,r.status,d);const e=new Error("PAYPAL_API_ERROR");(e as any).status=r.status;(e as any).data=d;throw e;}
  return d;
}
