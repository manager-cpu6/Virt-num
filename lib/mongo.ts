import {MongoClient,Db,Collection,Document} from "mongodb";import bcrypt from "bcryptjs";

const g=globalThis as unknown as {__numelixaMongoClient?:MongoClient;__numelixaMongoDb?:Db;__numelixaMongoUri?:string;__numelixaIndexes?:Promise<void>};

function uri(){
  const v=(process.env.MONGODB_URI||"").trim();
  if(!v) throw new Error("MongoDB is not configured. Add MONGODB_URI to the Vercel Production environment and redeploy.");
  return v;
}

export function getMongoClient(){
  const u=uri();
  if(g.__numelixaMongoClient&&g.__numelixaMongoUri===u)return g.__numelixaMongoClient;
  const client=new MongoClient(u,{maxPoolSize:10,serverSelectionTimeoutMS:10000});
  g.__numelixaMongoClient=client;
  g.__numelixaMongoUri=u;
  return client;
}

export async function getMongoDb(){
  if(g.__numelixaMongoDb)return g.__numelixaMongoDb;
  const client=getMongoClient();
  await client.connect();
  const dbName=(process.env.MONGODB_DB_NAME||"numelixa").trim();
  g.__numelixaMongoDb=client.db(dbName);
  await ensureIndexes(g.__numelixaMongoDb);
  return g.__numelixaMongoDb;
}

export async function collection<T extends Document=Document>(name:string):Promise<Collection<T>>{
  return (await getMongoDb()).collection<T>(name);
}

async function ensureIndexes(db:Db){
  if(g.__numelixaIndexes)return g.__numelixaIndexes;
  g.__numelixaIndexes=(async()=>{
    await Promise.all([
      db.collection("users").createIndex({email:1},{unique:true}),
      db.collection("sessions").createIndex({tokenHash:1},{unique:true}),
      db.collection("sessions").createIndex({expiresAt:1},{expireAfterSeconds:0}),
      db.collection("emailTokens").createIndex({tokenHash:1},{unique:true}),
      db.collection("emailTokens").createIndex({expiresAt:1},{expireAfterSeconds:0}),
      db.collection("orders").createIndex({providerOrderId:1},{unique:true,sparse:true}),
      db.collection("orders").createIndex({userId:1,createdAt:-1}),
      db.collection("coinTransactions").createIndex({userId:1,createdAt:-1}),
      db.collection("payments").createIndex({providerId:1},{unique:true,sparse:true}),
      db.collection("payments").createIndex({orderId:1},{unique:true}),
      db.collection("payments").createIndex({userId:1,createdAt:-1})
    ]);
  })().catch(e=>{g.__numelixaIndexes=undefined;throw e});
  return g.__numelixaIndexes;
}

export function mongoId(){
  return globalThis.crypto?.randomUUID?.()||String(Date.now())+"-"+Math.random().toString(36).slice(2);
}
