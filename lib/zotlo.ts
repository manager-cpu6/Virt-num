import crypto from "crypto";

const API="https://api.zotlo.com/v1";

function credentials(){
  const accessKey=process.env.ZOTLO_ACCESS_KEY?.trim();
  const accessSecret=process.env.ZOTLO_ACCESS_SECRET?.trim();
  const appId=process.env.ZOTLO_APP_ID?.trim();
  if(!accessKey||!accessSecret||!appId) throw new Error("ZOTLO_NOT_CONFIGURED");
  return {accessKey,accessSecret,appId};
}

export function packageIdForCoins(coins:number){
  const mapRaw=process.env.ZOTLO_PACKAGE_MAP?.trim();
  if(!mapRaw) throw new Error("ZOTLO_PACKAGE_MAP_NOT_CONFIGURED");
  let map:any;
  try{ map=JSON.parse(mapRaw); }catch{ throw new Error("ZOTLO_PACKAGE_MAP_INVALID"); }
  const id=String(map[String(coins)]||"").trim();
  if(!id) throw new Error("ZOTLO_PACKAGE_NOT_CONFIGURED");
  return id;
}

async function call(path:string,body:any){
  const c=credentials();
  const r=await fetch(API+"/"+path.replace(/^\//,""),{
    method:"POST",
    headers:{
      "Content-Type":"application/json",
      Accept:"application/json",
      AccessKey:c.accessKey,
      AccessSecret:c.accessSecret,
      ApplicationId:c.appId,
      Language:"en"
    },
    body:JSON.stringify(body),
    cache:"no-store"
  });
  const data=await r.json().catch(()=>null);
  if(!r.ok) throw new Error("ZOTLO_HTTP_"+r.status);
  if(data?.success===false || data?.error) throw new Error(String(data?.message||data?.error||"ZOTLO_REQUEST_FAILED"));
  return data;
}

export async function createPaymentForm(input:{
  packageId:string;
  subscriberId:string;
  email:string;
  name:string;
  ip:string;
  orderId:string;
  returnUrl:string;
}){
  const parts=input.name.trim().split(/\s+/).filter(Boolean);
  const data=await call("payment/create-form-url",{
    platform:"web",
    formId:process.env.ZOTLO_FORM_ID?.trim()||"payment-form",
    language:"en",
    packageId:input.packageId,
    subscriberId:input.subscriberId,
    subscriberEmail:input.email,
    subscriberFirstname:parts[0]||"Numelixa",
    subscriberLastname:parts.slice(1).join(" ")||"User",
    subscriberIpAddress:input.ip,
    subscriberCountry:process.env.ZOTLO_DEFAULT_COUNTRY?.trim()||"ET",
    customParameters:{numelixaOrderId:input.orderId},
  });
  const form=data?.result?.form;
  if(!form?.formUrl) throw new Error("ZOTLO_FORM_URL_MISSING");
  return {url:String(form.formUrl),transactionId:form.transactionId?String(form.transactionId):null,expireDate:form.expireDate||null};
}

export function getZotloAppId(){return credentials().appId;}

export function normalizeWebhook(data:any){
  const queue=data?.queue||{};
  const tx=data?.parameters||{};
  return {
    appId:String(queue.appId??tx.app_id??""),
    eventType:String(queue.eventType||""),
    type:String(queue.type||""),
    requestId:String(queue.requestID||""),
    transactionId:String(tx.transaction_id||tx.transactionId||""),
    status:String(tx.status||tx.provider_status||"").toLowerCase(),
    packageId:String(tx.package_id||tx.packageId||""),
    price:Number(tx.price??tx.package_price??0),
    currency:String(tx.currency||"").toUpperCase(),
    customParameters:tx.custom_parameters||tx.customParameters||{},
    raw:data
  };
}
