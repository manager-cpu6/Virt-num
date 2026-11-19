import crypto from "crypto";
import {lookup} from "node:dns/promises";
import {isIP} from "node:net";
import {collection} from "@/lib/mongo";

export type NumelixaWebhookEvent = "order.created" | "order.code_received" | "order.cancelled";

function isPrivateAddress(value:string){
  const address=value.toLowerCase().split("%")[0];
  const version=isIP(address);
  if(version===4){
    const [a,b,c]=address.split(".").map(Number);
    return a===0||a===10||a===127||a>=224||
      (a===169&&b===254)||
      (a===172&&b>=16&&b<=31)||
      (a===192&&b===168)||
      (a===100&&b>=64&&b<=127)||
      (a===192&&b===0&&c===0)||
      (a===192&&b===0&&c===2)||
      (a===198&&(b===18||b===19))||
      (a===198&&b===51&&c===100)||
      (a===203&&b===0&&c===113)||
      (a===255&&b===255&&c===255);
  }
  if(version===6){
    return address==="::"||address==="::1"||
      address.startsWith("fc")||address.startsWith("fd")||
      /^fe[89ab]/.test(address)||address.startsWith("ff")||
      address.startsWith("::ffff:")||address.startsWith("64:ff9b:")||
      address.startsWith("100:")||address.startsWith("2001:db8:")||
      address.startsWith("2002:");
  }
  return true;
}

async function safeEndpoint(value:string){
  let url:URL;
  try{url=new URL(value)}catch{return null}
  if(url.protocol!=="https:"||url.username||url.password)return null;
  const host=url.hostname.toLowerCase().replace(/^\[|\]$/g,"");
  if(host==="localhost"||host.endsWith(".localhost")||host.endsWith(".local"))return null;
  try{
    const records=await lookup(host,{all:true,verbatim:true});
    if(!records.length||records.some(record=>isPrivateAddress(record.address)))return null;
  }catch{return null}
  return url;
}

export async function deliverDeveloperWebhook(userId:string,event:NumelixaWebhookEvent,data:Record<string,unknown>){
  try{
    const hooks=await collection<any>("developerWebhooks");
    const config=await hooks.findOne({userId,enabled:true});
    if(!config?.url||!config?.secret)return;
    const url=await safeEndpoint(String(config.url));
    if(!url)return;
    const eventId=crypto.randomUUID();
    const timestamp=String(Math.floor(Date.now()/1000));
    const body=JSON.stringify({id:eventId,type:event,createdAt:new Date().toISOString(),data});
    const signature=crypto.createHmac("sha256",String(config.secret)).update(timestamp+"."+body).digest("hex");
    const controller=new AbortController();
    const timer=setTimeout(()=>controller.abort(),5000);
    try{
      const response=await fetch(url.toString(),{method:"POST",headers:{"Content-Type":"application/json","Accept":"application/json","User-Agent":"Numelixa-Webhooks/1.0","X-Numelixa-Event":event,"X-Numelixa-Event-Id":eventId,"X-Numelixa-Timestamp":timestamp,"X-Numelixa-Signature":"sha256="+signature},body,signal:controller.signal,redirect:"manual",cache:"no-store"});
      await hooks.updateOne({userId},{$set:{lastDeliveryAt:new Date(),lastStatus:response.status,lastEvent:event,lastError:response.status>=200&&response.status<300?null:"Endpoint returned HTTP "+response.status}});
    }finally{clearTimeout(timer)}
  }catch(error){
    try{await (await collection<any>("developerWebhooks")).updateOne({userId},{$set:{lastDeliveryAt:new Date(),lastError:error instanceof Error?error.message:"Delivery failed"}})}catch{}
    console.error("[DEVELOPER WEBHOOK DELIVERY]",error);
  }
}
