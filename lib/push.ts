import {getApps, initializeApp, cert} from "firebase-admin/app";
import {getMessaging} from "firebase-admin/messaging";

function firebaseApp(){
  const serviceJson=String(process.env.FIREBASE_SERVICE_ACCOUNT_JSON||"").trim();
  let service:any=null;

  if(serviceJson){
    try{
      service=JSON.parse(serviceJson);
      if(service.private_key) service.private_key=String(service.private_key).replace(/\\n/g,"\n");
    }catch(error){
      console.error("[FIREBASE CONFIG] Invalid FIREBASE_SERVICE_ACCOUNT_JSON",error);
    }
  }

  const projectId=service?.project_id||process.env.FIREBASE_PROJECT_ID;
  const clientEmail=service?.client_email||process.env.FIREBASE_CLIENT_EMAIL;
  const privateKey=service?.private_key||process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g,"\n");

  if(!projectId||!clientEmail||!privateKey){
    return null;
  }

  return getApps()[0]||initializeApp({
    credential:cert({projectId,clientEmail,privateKey})
  });
}

export async function sendPush(
  tokens:string[],
  title:string,
  body:string,
  data:Record<string,string>={}
){
  const app=firebaseApp();
  if(!app||!tokens.length){
    return {configured:Boolean(app),successCount:0,failureCount:0};
  }

  const unique=[...new Set(tokens.filter(Boolean))];
  let successCount=0;
  let failureCount=0;

  for(let i=0;i<unique.length;i+=500){
    const batch=unique.slice(i,i+500);
    const response=await getMessaging(app).sendEachForMulticast({
      tokens:batch,
      notification:{title,body},
      data:{url:data.url||"/",...data},
      android:{
        priority:"high",
        notification:{
          channelId:"numelixa",
          sound:"default"
        }
      }
    });
    successCount+=response.successCount;
    failureCount+=response.failureCount;
  }

  return {configured:true,successCount,failureCount};
}