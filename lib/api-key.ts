import crypto from "crypto";
import {collection,mongoId} from "@/lib/mongo";

const PREFIX="nx_live_";
export function createApiKey(){return PREFIX+crypto.randomBytes(32).toString("hex")}
export function hashApiKey(key:string){return crypto.createHash("sha256").update(key).digest("hex")}

export async function issueApiKey(userId:string,name="Production API key"){
 const raw=createApiKey(),now=new Date();
 await (await collection<any>("apiKeys")).insertOne({
  _id:mongoId(),userId,name:name.trim().slice(0,80)||"Production API key",
  keyHash:hashApiKey(raw),prefix:raw.slice(0,15),active:true,
  createdAt:now,lastUsedAt:null,revokedAt:null
 });
 return raw;
}

export async function ensureApiKey(userId:string){
 const keys=await collection<any>("apiKeys");
 const active=await keys.findOne({userId,active:true},{sort:{createdAt:-1}});
 if(active)return {raw:null,created:false,key:active};
 const raw=await issueApiKey(userId,"Production API key");
 const key=await keys.findOne({keyHash:hashApiKey(raw)});
 return {raw,created:true,key};
}

export async function revokeApiKey(userId:string,id:string){
 const keys=await collection<any>("apiKeys");
 const result=await keys.updateOne({_id:id,userId,active:true},{$set:{active:false,revokedAt:new Date()}});
 return result.matchedCount?result:null;
}

export async function listApiKeys(userId:string){
 return (await collection<any>("apiKeys")).find({userId}).sort({createdAt:-1}).project({
  _id:1,name:1,prefix:1,active:1,createdAt:1,lastUsedAt:1,revokedAt:1
 }).toArray();
}

export async function authenticateApiKey(raw:string){
 const key=String(raw||"").trim();
 if(!key.startsWith(PREFIX))return null;
 const item=await (await collection<any>("apiKeys")).findOne({keyHash:hashApiKey(key),active:true});
 if(!item)return null;
 await (await collection<any>("apiKeys")).updateOne({_id:item._id},{$set:{lastUsedAt:new Date()}});
 return String(item.userId);
}
