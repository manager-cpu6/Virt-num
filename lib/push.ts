import {getApps,initializeApp,cert} from "firebase-admin/app";
import {getMessaging} from "firebase-admin/messaging";

export type PushSendResult={configured:boolean;successCount:number;failureCount:number;invalidTokens:string[];errors:string[]};

function firebaseApp(){
 const serviceJson=String(process.env.FIREBASE_SERVICE_ACCOUNT_JSON||"").trim();
 let service:any=null;
 if(serviceJson){try{service=JSON.parse(serviceJson);if(service.private_key)service.private_key=String(service.private_key).replace(/\\n/g,"\n")}catch(error){console.error("[FIREBASE CONFIG] Invalid FIREBASE_SERVICE_ACCOUNT_JSON",error)}}
 const projectId=service?.project_id||process.env.FIREBASE_PROJECT_ID;
 const clientEmail=service?.client_email||process.env.FIREBASE_CLIENT_EMAIL;
 const privateKey=service?.private_key||process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g,"\n");
 if(!projectId||!clientEmail||!privateKey)return null;
 return getApps()[0]||initializeApp({credential:cert({projectId,clientEmail,privateKey})});
}

export type PushSendResult = {
 configured:boolean;
 successCount:number;
 failureCount:number;
 invalidTokens:string[];
 errors:{code:string;message:string}[];
};

export async function sendPush(tokens:string[],title:string,body:string,data:Record<string,string>={}):Promise<PushSendResult>{
 const app=firebaseApp();
 if(!app||!tokens.length)return {configured:Boolean(app),successCount:0,failureCount:0,invalidTokens:[],errors:[]};
 const unique=[...new Set(tokens.filter(Boolean))];
 let successCount=0,failureCount=0;
 const invalidTokens:string[]=[];const errors:{code:string;message:string}[]=[];
 for(let i=0;i<unique.length;i+=500){
  const batch=unique.slice(i,i+500);
  const response=await getMessaging(app).sendEachForMulticast({
   tokens:batch,notification:{title,body},
   data:{url:data.url||"/",...data},
   android:{priority:"high",notification:{channelId:"numelixa",sound:"default"}}
  });
  successCount+=response.successCount;failureCount+=response.failureCount;
  response.responses.forEach((item,index)=>{
   if(item.success)return;
   const code=String(item.error?.code||"unknown");
   const message=String(item.error?.message||"FCM send failed");
   if(errors.length<10)errors.push({code,message});
   if(code==="messaging/registration-token-not-registered"||code==="messaging/invalid-registration-token")invalidTokens.push(batch[index]);
  });
 }
 return {configured:true,successCount,failureCount,invalidTokens,errors};
}
