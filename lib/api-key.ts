import crypto from "crypto";
import {collection,mongoId} from "@/lib/mongo";

const PREFIX="nx_live_";
const CIPHER="aes-256-gcm";

function encryptionKey(){
 const seed=process.env.API_KEY_ENCRYPTION_SECRET||process.env.MONGO_URL;
 if(!seed)throw new Error("API key encryption secret is not configured.");
 return crypto.createHash("sha256").update("numelixa-api-key-v1:"+seed).digest();
}

function encryptApiKey(raw:string){
 const iv=crypto.randomBytes(12),cipher=crypto.createCipheriv(CIPHER,encryptionKey(),iv);
 const encrypted=Buffer.concat([cipher.update(raw,"utf8"),cipher.final()]);
 const tag=cipher.getAuthTag();
 return Buffer.concat([iv,tag,encrypted]).toString("base64url");
}

export function decryptApiKey(payload:string){
 const data=Buffer.from(payload,"base64url");
 if(data.length<29)throw new Error("Invalid encrypted API key.");
 const iv=data.subarray(0,12),tag=data.subarray(12,28),encrypted=data.subarray(28);
 const decipher=crypto.createDecipheriv(CIPHER,encryptionKey(),iv);
 decipher.setAuthTag(tag);
 return Buffer.concat([decipher.update(encrypted),decipher.final()]).toString("utf8");
}

export function createApiKey(){return PREFIX+crypto.randomBytes(32).toString("hex")}
export function hashApiKey(key:string){return crypto.createHash("sha256").update(key).digest("hex")}

export async function issueApiKey(userId:string,name="Production API key"){
 const raw=createApiKey(),now=new Date();
 await (await collection<any>("apiKeys")).insertOne({
  _id:mongoId(),userId,name:name.trim().slice(0,80)||"Production API key",
  keyHash:hashApiKey(raw),secretEncrypted:encryptApiKey(raw),prefix:raw.slice(0,15),active:true,
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

export async function getActiveApiKeySecret(userId:string){
 const key=await (await collection<any>("apiKeys")).findOne({userId,active:true},{projection:{secretEncrypted:1}});
 if(!key?.secretEncrypted)return null;
 return decryptApiKey(String(key.secretEncrypted));
}

export async function authenticateApiKey(raw:string){
 const key=String(raw||"").trim();
 if(!key.startsWith(PREFIX))return null;
 const item=await (await collection<any>("apiKeys")).findOne({keyHash:hashApiKey(key),active:true});
 if(!item)return null;
 await (await collection<any>("apiKeys")).updateOne({_id:item._id},{$set:{lastUsedAt:new Date()}});
 return String(item.userId);
}
