import crypto from "crypto";
import {collection} from "@/lib/mongo";

export type NumelixaWebhookEvent = "order.created" | "order.code_received" | "order.cancelled";

function safeEndpoint(value:string){
  let url:URL;
  try{url=new URL(value)}catch{return null}
  if(url.protocol!=="https:"||url.username||url.password)return null;
  const host=url.hostname.toLowerCase();
  if(host==="localhost"||host.endsWith(".localhost")||host.endsWith(".local")||host==="0.0.0.0"||host==="127.0.0.1"||host==="::1"||/^10\./.test(host)||/^192\.168\./.test(host)||/^172\.(1[6-9]|2\d|3[01])\./.test(host))return null;
  return url;
}

export async function deliverDeveloperWebhook(userId:string,event:NumelixaWebhookEvent,data:Record<string,unknown>){
  try{
    const hooks=await collection<any>("developerWebhooks");
    const config=await hooks.findOne({userId,enabled:true});
    if(!config?.url||!config?.secret)return;
    const url=safeEndpoint(String(config.url));
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
