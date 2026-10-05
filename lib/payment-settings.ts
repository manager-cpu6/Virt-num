import {collection} from "@/lib/mongo";
import crypto from "crypto";

export type PaymentProvider="nowpayments"|"paypal";
export type PaymentSettings={
  activeProvider:PaymentProvider;
  paypal:{clientId:string;secretKey:string;webhookId:string;configured:boolean};
  nowpayments:{configured:boolean};
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
    const decipher=crypto.createDecipheriv("aes-256-gcm",key(),Buffer.from(iv,"base64url"));
    decipher.setAuthTag(Buffer.from(tag,"base64url"));
    return Buffer.concat([decipher.update(Buffer.from(data,"base64url")),decipher.final()]).toString("utf8");
  }catch{return "";}
}
export async function getPaymentSettings():Promise<PaymentSettings>{
  const s=await (await collection<any>("settings")).findOne({_id:"payments"});
  const clientId=decrypt(String(s?.paypalClientId||""));
  const secretKey=decrypt(String(s?.paypalSecretKey||""));
  return {
    activeProvider:s?.activeProvider==="paypal"?"paypal":"nowpayments",
    paypal:{clientId,secretKey,webhookId:String(s?.paypalWebhookId||""),configured:Boolean(clientId&&secretKey&&s?.paypalWebhookId)},
    nowpayments:{configured:Boolean(process.env.NOWPAYMENTS_API_KEY&&process.env.NOWPAYMENTS_IPN_SECRET)},
    updatedAt:s?.updatedAt
  };
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
