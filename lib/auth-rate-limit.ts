import crypto from "crypto";
import {collection} from "@/lib/mongo";

const WINDOW_MS=15*60*1000;
const IDENTITY_LIMIT=10;
const IP_LIMIT=40;
const digest=(value:string)=>crypto.createHash("sha256").update(value).digest("hex");

function bucketKeys(email:string,headers:Headers){
  const now=Date.now();
  const windowId=Math.floor(now/WINDOW_MS);
  const identity=digest(email.trim().toLowerCase());
  const ip=String(headers.get("x-real-ip")||headers.get("x-forwarded-for")||"unknown").split(",")[0].trim();
  return {
    identityKey:"login:"+windowId+":identity:"+identity,
    ipKey:"login:"+windowId+":ip:"+digest(ip||"unknown"),
    expiresAt:new Date((windowId+2)*WINDOW_MS)
  };
}

async function increment(key:string,expiresAt:Date){
  const rows=await collection<any>("authRateLimits");
  try{
    await rows.updateOne({_id:key},{$inc:{count:1},$set:{updatedAt:new Date()},$setOnInsert:{expiresAt}},{upsert:true});
  }catch(error){
    // A concurrent first request may win the unique _id insert.
    if((error as {code?:number})?.code!==11000)throw error;
    await rows.updateOne({_id:key},{$inc:{count:1},$set:{updatedAt:new Date()}});
  }
  return Number((await rows.findOne({_id:key},{projection:{count:1}}))?.count||0);
}

export async function loginIsRateLimited(email:string,headers:Headers){
  const keys=bucketKeys(email,headers);
  const rows=await collection<any>("authRateLimits");
  const [identity,ip]=await Promise.all([
    rows.findOne({_id:keys.identityKey},{projection:{count:1}}),
    rows.findOne({_id:keys.ipKey},{projection:{count:1}})
  ]);
  return Number(identity?.count||0)>=IDENTITY_LIMIT||Number(ip?.count||0)>=IP_LIMIT;
}

export async function recordLoginFailure(email:string,headers:Headers){
  const keys=bucketKeys(email,headers);
  await Promise.all([increment(keys.identityKey,keys.expiresAt),increment(keys.ipKey,keys.expiresAt)]);
}

export async function clearLoginFailure(email:string,headers:Headers){
  const keys=bucketKeys(email,headers);
  await (await collection<any>("authRateLimits")).deleteOne({_id:keys.identityKey});
}
