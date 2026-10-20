import {collection} from "@/lib/mongo";
import crypto from "crypto";

export type PaymentProvider="nowpayments"|"paypal"|"binance";
export type BinanceConnectionInput={
  webshareHost?:string;websharePort?:string|number;webshareUsername?:string;websharePassword?:string;
  apiKey?:string;apiSecret?:string;
};
export type BinanceConnectionConfig={
  apiKey:string;apiSecret:string;webshareHost:string;websharePort:string;webshareUsername:string;websharePassword:string;
};
export type PaymentSettings={
  activeProvider:PaymentProvider;
  paypal:{clientId:string;secretKey:string;webhookId:string;configured:boolean};
  nowpayments:{configured:boolean};
  binance:{configured:boolean;webshareConfigured:boolean;webshareHost:string;websharePort:string;webshareUsernamePreview:string;apiKeyPreview:string};
  updatedAt?:Date;
};

function secret(){
  return String(process.env.PAYMENT_SETTINGS_SECRET||process.env.AUTH_SECRET||process.env.MONGODB_URI||"numelixa-payment-settings").trim();
}
function key(){return crypto.createHash("sha256").update(secret()).digest();}
function encrypt(value:string){
  if(!value)return "";
  const iv=crypto.randomBytes(12),cipher=crypto.createCipheriv("aes-256-gcm",key(),iv);
  const data=Buffer.concat([cipher.update(value,"utf8"),cipher.final()]);
  return [iv.toString("base64url"),cipher.getAuthTag().toString("base64url"),data.toString("base64url")].join(".");
}
function decrypt(value:string){
  if(!value)return "";
  try{
    const [iv,tag,data]=value.split(".");
    const decipher=crypto.createDecipheriv("aes-256-gcm",key(),iv?Buffer.from(iv,"base64url"):Buffer.alloc(0));
    decipher.setAuthTag(Buffer.from(tag,"base64url"));
    return Buffer.concat([decipher.update(Buffer.from(data,"base64url")),decipher.final()]).toString("utf8");
  }catch{return "";}
}
function env(name:string){return String(process.env[name]||"").trim();}
function firstSaved(saved:any,field:string,environmentName:string){return decrypt(String(saved?.[field]||""))||env(environmentName);}
export async function getBinanceConnectionConfig():Promise<BinanceConnectionConfig>{
  const s=await (await collection<any>("settings")).findOne({_id:"payments"});
  return {
    apiKey:firstSaved(s,"binanceApiKey","BINANCE_API_KEY"),
    apiSecret:firstSaved(s,"binanceApiSecret","BINANCE_SECRET_KEY"),
    webshareHost:firstSaved(s,"webshareHost","WEBSHARE_PROXY_HOST"),
    websharePort:firstSaved(s,"websharePort","WEBSHARE_PROXY_PORT"),
    webshareUsername:firstSaved(s,"webshareUsername","WEBSHARE_PROXY_USERNAME"),
    websharePassword:firstSaved(s,"websharePassword","WEBSHARE_PROXY_PASSWORD"),
  };
}
export async function getPaymentSettings():Promise<PaymentSettings>{
  const s=await (await collection<any>("settings")).findOne({_id:"payments"});
  const clientId=decrypt(String(s?.paypalClientId||""));
  const secretKey=decrypt(String(s?.paypalSecretKey||""));
  const binance=await getBinanceConnectionConfig();
  const webshareConfigured=Boolean(binance.webshareHost&&/^\d{1,5}$/.test(binance.websharePort)&&Number(binance.websharePort)>0&&Number(binance.websharePort)<=65535&&binance.webshareUsername&&binance.websharePassword);
  const configured=Boolean(binance.apiKey&&binance.apiSecret&&webshareConfigured);
  return {
    activeProvider:s?.activeProvider==="paypal"?"paypal":s?.activeProvider==="binance"?"binance":"nowpayments",
    paypal:{clientId,secretKey,webhookId:String(s?.paypalWebhookId||""),configured:Boolean(clientId&&secretKey&&s?.paypalWebhookId)},
    nowpayments:{configured:Boolean(process.env.NOWPAYMENTS_API_KEY&&process.env.NOWPAYMENTS_IPN_SECRET)},
    binance:{configured,webshareConfigured,webshareHost:binance.webshareHost,websharePort:binance.websharePort,webshareUsernamePreview:binance.webshareUsername?binance.webshareUsername.slice(0,2)+"•••":"",apiKeyPreview:binance.apiKey?binance.apiKey.slice(0,5)+"••••••":""},
    updatedAt:s?.updatedAt
  };
}
export async function saveBinanceConnectionConfig(input:BinanceConnectionInput){
  const current=await getBinanceConnectionConfig();
  const merged:BinanceConnectionConfig={
    apiKey:String(input.apiKey||"").trim()||current.apiKey,
    apiSecret:String(input.apiSecret||"").trim()||current.apiSecret,
    webshareHost:String(input.webshareHost||"").trim().replace(/^https?:\/\//i,"").replace(/\/$/,"")||current.webshareHost,
    websharePort:String(input.websharePort||"").trim()||current.websharePort,
    webshareUsername:String(input.webshareUsername||"").trim()||current.webshareUsername,
    websharePassword:String(input.websharePassword||"").trim()||current.websharePassword,
  };
  if(!merged.apiKey||!merged.apiSecret)throw new Error("BINANCE_CREDENTIALS_REQUIRED");
  if(!merged.webshareHost||merged.webshareHost.includes("/")||!/^\d{1,5}$/.test(merged.websharePort)||Number(merged.websharePort)<1||Number(merged.websharePort)>65535||!merged.webshareUsername||!merged.websharePassword)throw new Error("WEBSHARE_CONFIGURATION_INVALID");
  const settings=await collection<any>("settings");
  await settings.updateOne({_id:"payments"},{$set:{
    binanceApiKey:encrypt(merged.apiKey),binanceApiSecret:encrypt(merged.apiSecret),
    webshareHost:encrypt(merged.webshareHost),websharePort:encrypt(merged.websharePort),
    webshareUsername:encrypt(merged.webshareUsername),websharePassword:encrypt(merged.websharePassword),
    updatedAt:new Date()
  }},{upsert:true});
  return getPaymentSettings();
}
export async function savePaypalCredentials(clientId:string,secretKey:string,webhookId:string){
  const settings=await collection<any>("settings");
  await settings.updateOne({_id:"payments"},{$set:{
    paypalClientId:encrypt(clientId.trim()),
    paypalSecretKey:encrypt(secretKey.trim()),
    paypalWebhookId:webhookId.trim(),
    updatedAt:new Date()
  }},{upsert:true});
}
export async function setActivePaymentProvider(provider:PaymentProvider){
  await (await collection<any>("settings")).updateOne({_id:"payments"},{$set:{activeProvider:provider,updatedAt:new Date()}},{upsert:true});
}
export function paypalBaseUrl(){return String(process.env.PAYPAL_ENV||"sandbox").toLowerCase()==="live"?"https://api-m.paypal.com":"https://api-m.sandbox.paypal.com";}
