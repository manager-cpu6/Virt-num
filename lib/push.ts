import {getApp,getApps,initializeApp,cert,type App} from "firebase-admin/app";
import {getMessaging,type Message} from "firebase-admin/messaging";

const FIREBASE_APP_NAME="numelixa-fcm";

function readServiceAccount(){
  const raw=String(
    process.env.FIREBASE_SERVICE_ACCOUNT_JSON||
    process.env.FIREBASE_SERVICE_ACCOUNT||
    ""
  ).trim();

  if(!raw)return null;

  try{
    const parsed=JSON.parse(raw);
    if(parsed?.private_key){
      parsed.private_key=String(parsed.private_key).replace(/\\n/g,"\n");
    }
    return parsed;
  }catch(error){
    console.error("[FIREBASE CONFIG] Invalid service-account JSON",error);
    return null;
  }
}

function firebaseApp():App|null{
  const service=readServiceAccount();
  const projectId=String(service?.project_id||process.env.FIREBASE_PROJECT_ID||"").trim();
  const clientEmail=String(service?.client_email||process.env.FIREBASE_CLIENT_EMAIL||"").trim();
  const privateKey=String(
    service?.private_key||
    process.env.FIREBASE_PRIVATE_KEY||
    ""
  ).replace(/\\n/g,"\n").trim().replace(/^["']|["']$/g,"");

  if(!projectId||!clientEmail||!privateKey){
    console.error("[FIREBASE CONFIG] Missing Firebase Admin credentials.");
    return null;
  }

  try{
    const existing=getApps().find(app=>app.name===FIREBASE_APP_NAME);
    if(existing)return existing;

    const app=initializeApp({
      credential:cert({projectId,clientEmail,privateKey}),
      projectId
    },FIREBASE_APP_NAME);

    console.info("[FIREBASE CONFIG] Firebase Admin initialized",{
      projectId,
      appName:FIREBASE_APP_NAME
    });
    return app;
  }catch(error){
    console.error("[FIREBASE CONFIG] Firebase Admin initialization failed",{
      projectId,
      message:error instanceof Error?error.message:String(error)
    });
    return null;
  }
}

export function isFirebaseConfigured(){ return Boolean(firebaseApp()); }

export type PushSendResult={
  configured:boolean;
  successCount:number;
  failureCount:number;
  invalidTokens:string[];
  errors:{code:string;message:string}[];
};

function makeMessage(token:string,title:string,body:string,data:Record<string,string>):Message{
  return {
    token,
    notification:{title,body},
    data:{url:data.url||"/",...data},
    android:{
      priority:"high",
      ttl:2419200*1000,
      notification:{
        channelId:"numelixa",
        sound:"default",
        defaultSound:true
      }
    }
  };
}

export async function sendPush(
  tokens:string[],
  title:string,
  body:string,
  data:Record<string,string>={}
):Promise<PushSendResult>{
  const unique=[...new Set(tokens.map(x=>String(x||"").trim()).filter(Boolean))];

  console.info("[FCM PUSH] send requested",{
    tokenCount:unique.length,
    title:String(title||"").slice(0,80)
  });

  const app=firebaseApp();

  if(!unique.length){
    return {
      configured:Boolean(app),
      successCount:0,
      failureCount:0,
      invalidTokens:[],
      errors:[{code:"messaging/no-tokens",message:"No registered FCM device tokens."}]
    };
  }

  if(!app){
    return {
      configured:false,
      successCount:0,
      failureCount:unique.length,
      invalidTokens:[],
      errors:[{
        code:"messaging/server-not-configured",
        message:"Firebase Admin is not configured. Add FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY to Vercel Production."
      }]
    };
  }

  let successCount=0;
  let failureCount=0;
  const invalidTokens:string[]=[];
  const errors:{code:string;message:string}[]=[];
  const messaging=getMessaging(app);

  // FCM supports batches of up to 500 messages. Individual messages give us
  // an exact response for every device, which makes failures diagnosable.
  for(let i=0;i<unique.length;i+=500){
    const batch=unique.slice(i,i+500);
    const messages=batch.map(token=>makeMessage(token,title,body,data));

    let pending=batch.map((token,index)=>({token,index}));
    for(let attempt=1;attempt<=3&&pending.length;attempt++){
      try{
        const response=await messaging.sendEach(pending.map(x=>messages[x.index]));
        const next:any[]=[];

        response.responses.forEach((item,index)=>{
          const target=pending[index];
          if(item.success){
            successCount++;
            return;
          }

          const code=String(item.error?.code||"unknown");
          const messageText=String(item.error?.message||"FCM send failed");

          if(code==="messaging/registration-token-not-registered"||code==="messaging/invalid-registration-token"){
            invalidTokens.push(target.token);
            failureCount++;
            return;
          }

          const retryable=[
            "messaging/internal-error",
            "messaging/server-unavailable",
            "messaging/unavailable",
            "messaging/quota-exceeded"
          ].includes(code);

          if(retryable&&attempt<3){
            next.push(target);
          }else{
            failureCount++;
            if(errors.length<20)errors.push({code,message:messageText});
          }
        });

        pending=next;
        if(pending.length&&attempt<3){
          await new Promise(resolve=>setTimeout(resolve,300*Math.pow(3,attempt-1)));
        }
      }catch(error){
        const messageText=error instanceof Error?error.message:String(error);
        if(attempt<3){
          await new Promise(resolve=>setTimeout(resolve,300*Math.pow(3,attempt-1)));
        }else{
          failureCount+=pending.length;
          if(errors.length<20)errors.push({code:"messaging/send-batch-failed",message:messageText});
          console.error("[FCM SEND BATCH]",messageText);
        }
      }
    }
  }

  const result={
    configured:true,
    successCount,
    failureCount,
    invalidTokens:[...new Set(invalidTokens)],
    errors
  };

  console.info("[FCM PUSH] send completed",{
    tokenCount:unique.length,
    successCount,
    failureCount,
    errorCount:errors.length,
    firstError:errors[0]||null
  });

  return result;
}
