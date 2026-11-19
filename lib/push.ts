import {getApps,initializeApp,cert,deleteApp} from "firebase-admin/app";
import {getMessaging} from "firebase-admin/messaging";
import {getFirebaseServerSettings} from "@/lib/firebase-settings";
import crypto from "crypto";
import {collection} from "@/lib/mongo";
import {sendEmailFrom,emailTemplate} from "@/lib/mailer";

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
 const privateKey=String(settings.privateKey||"").replace(/\n/g,"\n").replace(/\r\n/g,"\n").trim();
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
 errors:{code:string;message:string}[];successfulTokens?:string[];messageIds?:string[];emailSuccessCount?:number;emailFailureCount?:number;emailSuccessfulUserIds?:string[];
};
const sleep=(ms:number)=>new Promise(resolve=>setTimeout(resolve,ms));
const notificationIconFor=(data:Record<string,string>)=>{
 const requested=String(data.iconType||data.notificationCategory||data.notificationIcon||"").toLowerCase().trim();
 const allowed=new Set(["admin","number","otp","auto","payment","gift","general","user","system","numelixa","announcement","success"]);
 if(allowed.has(requested))return "ic_notification_"+requested;
 const type=String(data.type||"").toLowerCase();
 if(type.includes("auto")||type.includes("automation")||type.includes("background"))return "ic_notification_auto";
 if(type.includes("otp")||type.includes("verification")||type==="sms"||type.includes("code"))return "ic_notification_otp";
 if(type.includes("number")||type.includes("order")||type.includes("activation")||type.includes("purchase"))return "ic_notification_number";
 if(type.includes("payment")||type.includes("wallet")||type.includes("deposit")||type.includes("balance"))return "ic_notification_payment";
 if(type.includes("gift")||type.includes("reward")||type.includes("bonus"))return "ic_notification_gift";
 if(type.includes("system")||type.includes("maintenance"))return "ic_notification_system";
 if(type.includes("success")||type.includes("completed"))return "ic_notification_success";
 if(type.includes("announcement")||type.includes("news"))return "ic_notification_announcement";
 if(type.includes("user")||type.includes("account"))return "ic_notification_user";
 if(type.includes("numelixa")||type.includes("brand"))return "ic_notification_numelixa";
 return "ic_notification_general";
};
const channelFor=(data:Record<string,string>)=>{
 const type=String(data.type||"").toLowerCase();
 if(["sms","verification","verification_code"].includes(type))return "verification";
 if(["security","login","login_approval","account_security"].includes(type))return "security";
 if(["admin","announcement","push_test"].includes(type))return "admin";
 return "general";
};

export async function sendPush(tokens:string[],title:string,body:string,data:Record<string,string>={}):Promise<PushSendResult>{
 const allTokens=[...new Set(tokens.map(String).map(x=>x.trim()).filter(x=>x.length>=20))];
 const errors:{code:string;message:string}[]=[];
 let emailSuccessCount=0,emailFailureCount=0;
 const emailSuccessfulUserIds:string[]=[];
 let pushTokens=allTokens;
 let tokenUserIds=new Map<string,string>();
 try{
  const explicitUserIds=String(data.userIds||"").split(",").map(x=>x.trim()).filter(Boolean);
  const deviceRows=allTokens.length
   ?await (await collection<any>("deviceTokens")).find({token:{$in:allTokens}},{projection:{token:1,userId:1}}).toArray()
   :[];
  tokenUserIds=new Map<string,string>(deviceRows.map((row:any)=>[String(row.token||""),String(row.userId||"")] as [string,string]).filter(([token,userId])=>Boolean(token&&userId)));
  const userIds=[...new Set([...tokenUserIds.values(),...explicitUserIds])];
  if(userIds.length){
   const users=await (await collection<any>("users")).find({_id:{$in:userIds}},{projection:{_id:1,email:1,notificationPreferences:1,name:1}}).toArray();
   const byId=new Map(users.map(user=>[String(user._id),user]));
   pushTokens=allTokens.filter(token=>{
    const userId=tokenUserIds.get(token);
    if(!userId)return true;
    const user=byId.get(userId);
    return user?.notificationPreferences?.appEnabled!==false;
   });
   const emailUsers=users.filter(user=>user.notificationPreferences?.emailEnabled===true&&String(user.email||"").includes("@"));
   const escapeHtml=(value:string)=>value.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");
   const mailResults:{id:string;ok:boolean}[]=[];
   for(let i=0;i<emailUsers.length;i+=5){
    const batch=emailUsers.slice(i,i+5);
    const results=await Promise.all(batch.map(async user=>{
     try{
      await sendEmailFrom("notification",String(user.email),escapeHtml(title),emailTemplate(escapeHtml(title),escapeHtml(body).replace(/\n/g,"<br>"),"https://www.numelixa.com/account","Numelixa service notification"));
      return {id:String(user._id),ok:true};
     }catch(error){
      console.error("[USER_NOTIFICATION_EMAIL_FAILURE]",{userId:String(user._id),message:error instanceof Error?error.message:"Email delivery failed"});
      return {id:String(user._id),ok:false};
     }
    }));
    mailResults.push(...results);
   }
   emailSuccessCount=mailResults.filter(x=>x.ok).length;
   emailFailureCount=mailResults.length-emailSuccessCount;
   emailSuccessfulUserIds.push(...mailResults.filter(x=>x.ok).map(x=>x.id));
  }
 }catch(error){
  console.error("[NOTIFICATION_PREFERENCES_RESOLUTION]",error instanceof Error?error.message:"Unable to resolve notification preferences");
  if(errors.length<20)errors.push({code:"notification-preferences-unavailable",message:"Could not apply saved notification preferences."});
 }
 if(!pushTokens.length){
  return {configured:true,successCount:0,failureCount:0,invalidTokens:[],errors,emailSuccessCount,emailFailureCount,emailSuccessfulUserIds};
 }
 let app:Awaited<ReturnType<typeof firebaseApp>>;
 try{app=await firebaseApp()}catch(error){
  return {configured:false,successCount:0,failureCount:pushTokens.length,invalidTokens:[],errors:[...errors,{code:"firebase-admin-init-failed",message:error instanceof Error?error.message:"Firebase Admin credentials could not be initialized."}],emailSuccessCount,emailFailureCount,emailSuccessfulUserIds};
 }
 if(!app)return {configured:false,successCount:0,failureCount:pushTokens.length,invalidTokens:[],errors:[...errors,{code:"firebase-config-missing",message:"Firebase Admin credentials are incomplete. Configure Firebase Admin credentials in Vercel Production."}],emailSuccessCount,emailFailureCount,emailSuccessfulUserIds};
 const channelId=channelFor(data);
 console.info("[FCM_SEND_START]",{projectId:EXPECTED_PROJECT_ID,deviceCount:pushTokens.length,channelId,type:String(data.type||"general")});
 let successCount=0,failureCount=0;
 const invalidTokens:string[]=[],successfulTokens:string[]=[],messageIds:string[]=[];
 for(let i=0;i<pushTokens.length;i+=500){
  const batch=pushTokens.slice(i,i+500);
  const type=String(data.type||"").toLowerCase();
  const codeCandidate=String(data.code||data.otp||data.verificationCode||data.smsCode||"").trim();
  const code= /^\d{4,8}$/.test(codeCandidate) ? codeCandidate : (body.match(/(?<!\d)\d{4,8}(?!\d)/)||[])[0]||"";
  const copyCodePush=["sms","verification","verification_code"].includes(type)&&data.copyCode==="true"&&Boolean(code);
  const messageData=Object.fromEntries(Object.entries({
   url:data.url||"/",...data,
   iconType:data.iconType||data.notificationCategory||"general",
   notificationCategory:data.iconType||data.notificationCategory||"general",
   title,body,...(copyCodePush?{code}:{})
  }).filter(([key])=>key!=="userIds").map(([key,value])=>[key,String(value)]));
  const payload={
   tokens:batch,
   notification:{title,body},
   data:messageData,
   android:{
    priority:"high" as const,
    ttl:28*24*60*60*1000,
    notification:{
     title,body,
     icon:notificationIconFor(messageData),
     channelId,
     sound:"default",
     priority:"high" as const,
     color:"#00D9FF"
    }
   }
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
 console.info(successCount>0?"[FCM_SEND_SUCCESS]":"[FCM_SEND_FAILURE]",{projectId:EXPECTED_PROJECT_ID,attempted:pushTokens.length,sent:successCount,failed:failureCount,invalidTokens:invalidTokens.length,channelId,messageIds:messageIds.length,emailSuccessCount,emailFailureCount});
 return {configured:true,successCount,failureCount,invalidTokens,errors,successfulTokens,messageIds,emailSuccessCount,emailFailureCount,emailSuccessfulUserIds};
}
