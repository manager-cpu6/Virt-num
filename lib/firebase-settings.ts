import crypto from "crypto";
import {collection} from "@/lib/mongo";

export type FirebaseServerSettings = {
  projectId: string;
  clientEmail: string;
  privateKey: string;
};

const SETTINGS_ID = "active";
function encryptionKey() {
  const value = String(process.env.FIREBASE_SETTINGS_ENCRYPTION_KEY || "").trim();
  if (value.length < 32) throw new Error("FIREBASE_SETTINGS_ENCRYPTION_KEY must be set in Vercel Production and contain at least 32 characters.");
  return crypto.createHash("sha256").update(value).digest();
}
function decrypt(payload: {iv:string;tag:string;data:string}) {
  const decipher = crypto.createDecipheriv("aes-256-gcm", encryptionKey(), Buffer.from(payload.iv,"base64"));
  decipher.setAuthTag(Buffer.from(payload.tag,"base64"));
  return Buffer.concat([decipher.update(Buffer.from(payload.data,"base64")),decipher.final()]).toString("utf8");
}
export function encryptFirebaseSettings(value: FirebaseServerSettings) {
  const iv=crypto.randomBytes(12);
  const cipher=crypto.createCipheriv("aes-256-gcm",encryptionKey(),iv);
  const data=Buffer.concat([cipher.update(JSON.stringify(value),"utf8"),cipher.final()]);
  return {iv:iv.toString("base64"),tag:cipher.getAuthTag().toString("base64"),data:data.toString("base64")};
}
export async function getFirebaseServerSettings():Promise<FirebaseServerSettings>{
  try {
    const row=await (await collection<any>("firebaseSettings")).findOne({_id:SETTINGS_ID});
    if(row?.encrypted){
      const parsed=JSON.parse(decrypt(row.encrypted));
      if(parsed?.projectId&&parsed?.clientEmail&&parsed?.privateKey)return {
        projectId:String(parsed.projectId).trim(),
        clientEmail:String(parsed.clientEmail).trim(),
        privateKey:String(parsed.privateKey).replace(/\\n/g,"\n").replace(/\r\n/g,"\n").trim()
      };
    }
  } catch(error) {
    if (process.env.FIREBASE_SETTINGS_ENCRYPTION_KEY) throw error;
  }
  const json=String(process.env.FIREBASE_SERVICE_ACCOUNT_JSON||process.env.FIREBASE_SERVICE_ACCOUNT||"").trim();
  let service:any=null;
  if(json){try{service=JSON.parse(json)}catch{throw new Error("Firebase service-account JSON is invalid.")}}
  return {
    projectId:String(service?.project_id||process.env.FIREBASE_PROJECT_ID||"numelixa").trim(),
    clientEmail:String(service?.client_email||process.env.FIREBASE_CLIENT_EMAIL||"").trim(),
    privateKey:String(service?.private_key??process.env.FIREBASE_PRIVATE_KEY??"").replace(/\\n/g,"\n").replace(/\r\n/g,"\n").trim()
  };
}
export async function getSavedFirebaseSettings(){
  const row=await (await collection<any>("firebaseSettings")).findOne({_id:SETTINGS_ID});
  if(!row?.encrypted)return null;
  return JSON.parse(decrypt(row.encrypted)) as FirebaseServerSettings;
}
