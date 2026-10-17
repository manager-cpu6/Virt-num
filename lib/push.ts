import {getApps,initializeApp,cert,deleteApp} from "firebase-admin/app";
import {getMessaging} from "firebase-admin/messaging";
import {getFirebaseServerSettings} from "@/lib/firebase-settings";
import crypto from "crypto";

const EXPECTED_PROJECT_ID="numelixa";
let initDiagnosticLogged=false;
const pushGlobal=globalThis as typeof globalThis & {__numelixaFirebaseFingerprint?:string};

async function firebaseApp(){
 let settings;
 try{settings=await getFirebaseServerSettings()}catch(error){
  console.error("[FCM_ADMIN_SETTINGS_FAILURE]",{message:error instanceof Error?error.message:"Unable to load Firebase settings"});
  throw new Error("Firebase Admin settings could not be loaded. Check encrypted admin settings and FIREBASE_SETTINGS_ENCRYPTION_KEY.");
 }
 const projectId=String(settings.projectId||EXPECTED_PROJECT_ID).trim();
 const clientEmail=String(settings.clientEmail||"").trim();
 const privateKey=String(settings.privateKey||"").replace(/\\n/g,"\n").replace(/\r\n/g,"\n").trim();
 if(projectId!==EXPECTED_PROJECT_ID){
  console.error("[FCM_ADMIN_INIT_FAILURE]",{code:"firebase-project-mismatch",expectedProject:EXPECTED_PROJECT_ID,configuredProject:projectId});
  throw new Error("Firebase Admin credentials must belong to the Numelixa Firebase project.");
 }
 if(!clientEmail||!privateKey){
  console.warn("[FCM_ADMIN_INIT_MISSING_CREDENTIALS]",{projectId,clientEmailConfigured:Boolean(clientEmail),privateKeyConfigured:Boolean(privateKey)});
  return null;
 }
 if(!clientEmail.endsWith("@numelixa.iam.gserviceaccount.com")){
  console.error("[FCM_ADMIN_INIT_FAILURE]",{code:"firebase-service-account-project-mismatch",expectedProject:EXPECTED_PROJECT_ID,clientEmailDomain:clientEmail.split("@").pop()||"missing"});
  throw new Error("Firebase service-account email must belong to the numelixa project.");
 }
 const fingerprint=crypto.createHash("sha256").update(projectId+"|"+clientEmail+"|"+privateKey).digest("hex");
 let existing=getApps().find(app=>app.name==="numelixa-fcm");
 if(existing&&pushGlobal.__numelixaFirebaseFingerprint!==fingerprint){
  await deleteApp(existing);
  existing=undefined;
 }
 if(existing){
  if(!initDiagnosticLogged){console.info("[FCM_ADMIN_INITIALIZED]",{projectId,mode:"server-settings",reused:true});initDiagnosticLogged=true;}
  return existing;
 }
 try{
  const app=initializeApp({credential:cert({projectId,clientEmail,privateKey})},"numelixa-fcm");
  pushGlobal.__numelixaFirebaseFingerprint=fingerprint;
  console.info("[FCM_ADMIN_INITIALIZED]",{projectId,mode:"server-settings",reused:false});
  initDiagnosticLogged=true;
  return app;
 }catch(error){
  console.error("[FCM_ADMIN_INIT_FAILURE]",{code:"firebase-admin-init-failed",message:error instanceof Error?error.message:"Unknown initialization error"});
  throw new Error("Firebase Admin initialization failed. Verify the service-account credentials and project.");
 }
}
export async function isFirebaseConfigured(){try{return Boolean(await firebaseApp())}catch{return false}}

export type PushSendResult={
 configured:boolean;successCount:number;failureCount:number;invalidTokens:string[];
 errors:{code:string;message:string}[];successfulTokens?:string[];messageIds?:string[];
};
const sleep=(ms:number)=>new Promise(resolve=>setTimeout(resolve,ms));
const channelFor=(data:Record<string,string>)=>{
 const type=String(data.type||"").toLowerCase();
 if(["sms","verification","verification_code"].includes(type))return "verification";
 if(["security","login","login_approval","account_security"].includes(type))return "security";
 if(["admin","announcement","push_test"].includes(type))return "admin";
 return "general";
};

export async function sendPush(tokens:string[],title:string,body:string,data:Record<string,string>={}):Promise<PushSendResult>{
 let app:ReturnType<typeof firebaseApp>;
 try{app=await firebaseApp()}catch(error){
  return {configured:false,successCount:0,failureCount:tokens.length,invalidTokens:[],errors:[{code:"firebase-admin-init-failed",message:error instanceof Error?error.message:"Firebase Admin credentials could not be initialized."}]};
 }
 if(!app)return {configured:false,successCount:0,failureCount:tokens.length,invalidTokens:[],errors:[{code:"firebase-config-missing",message:"Firebase Admin credentials are incomplete. Configure FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY in Vercel Production."}]};
 const unique=[...new Set(tokens.map(String).map(x=>x.trim()).filter(x=>x.length>=20))];
 if(!unique.length)return {configured:true,successCount:0,failureCount:0,invalidTokens:[],errors:[]};
 const channelId=channelFor(data);
 console.info("[FCM_SEND_START]",{projectId:EXPECTED_PROJECT_ID,deviceCount:unique.length,channelId,type:String(data.type||"general")});
 let successCount=0,failureCount=0;
 const invalidTokens:string[]=[],successfulTokens:string[]=[],messageIds:string[]=[];
 const errors:{code:string;message:string}[]=[];
 for(let i=0;i<unique.length;i+=500){
  const batch=unique.slice(i,i+500);
  const payload={
   tokens:batch,notification:{title,body},
   data:Object.fromEntries(Object.entries({url:data.url||"/",...data}).map(([key,value])=>[key,String(value)])),
   android:{priority:"high" as const,ttl:28*24*60*60*1000,notification:{channelId,sound:"default" as const}}
  };
  let response;
  try{
   response=await getMessaging(app).sendEachForMulticast(payload);
   if(response.responses.some(x=>!x.success&&["messaging/server-unavailable","messaging/internal-error","messaging/quota-exceeded"].includes(String(x.error?.code||"")))){
    await sleep(350);
    try{response=await getMessaging(app).sendEachForMulticast(payload)}
    catch(error){if(errors.length<20)errors.push({code:"fcm-retry-failed",message:error instanceof Error?error.message:"FCM retry failed"});}
   }
  }catch(error){
   const message=error instanceof Error?error.message:"FCM send failed";
   console.error("[FCM_SEND_FAILURE]",{projectId:EXPECTED_PROJECT_ID,deviceCount:batch.length,channelId,code:(error as any)?.code||"messaging-send-failed",message});
   failureCount+=batch.length;
   if(errors.length<20)errors.push({code:String((error as any)?.code||"messaging-send-failed"),message});
   continue;
  }
  successCount+=response.successCount;failureCount+=response.failureCount;
  response.responses.forEach((item,index)=>{
   if(item.success){successfulTokens.push(batch[index]);if(item.messageId)messageIds.push(item.messageId);return;}
   const code=String(item.error?.code||"unknown"),message=String(item.error?.message||"FCM send failed");
   if(errors.length<20)errors.push({code,message});
   if(code==="messaging/registration-token-not-registered"||code==="messaging/invalid-registration-token"){
    invalidTokens.push(batch[index]);
    console.warn("[FCM_TOKEN_INVALID]",{code,batchIndex:index,cleanupRequired:true});
   }
  });
 }
 console.info(successCount>0?"[FCM_SEND_SUCCESS]":"[FCM_SEND_FAILURE]",{projectId:EXPECTED_PROJECT_ID,attempted:unique.length,sent:successCount,failed:failureCount,invalidTokens:invalidTokens.length,channelId,messageIds:messageIds.length});
 return {configured:true,successCount,failureCount,invalidTokens,errors,successfulTokens,messageIds};
}
