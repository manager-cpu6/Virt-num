import {getApps,initializeApp,cert, type App} from "firebase-admin/app";
import {getMessaging, type MulticastMessage} from "firebase-admin/messaging";

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
    console.error("[FIREBASE CONFIG] Missing FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL or FIREBASE_PRIVATE_KEY/service-account JSON.");
    return null;
  }

  try{
    return getApps()[0]||initializeApp({
      credential:cert({projectId,clientEmail,privateKey})
    });
  }catch(error){
    console.error("[FIREBASE CONFIG] Firebase Admin initialization failed",error);
    return null;
  }
}

export type PushSendResult={
  configured:boolean;
  successCount:number;
  failureCount:number;
  invalidTokens:string[];
  errors:{code:string;message:string}[];
};

export async function sendPush(
  tokens:string[],
  title:string,
  body:string,
  data:Record<string,string>={}
):Promise<PushSendResult>{
  const unique=[...new Set(tokens.map(x=>String(x||"").trim()).filter(Boolean))];

  console.info("[FCM PUSH] send requested", {
    tokenCount:unique.length,
    title:String(title||"").slice(0,80)
  });

  if(!unique.length){
    return {
      configured:Boolean(firebaseApp()),
      successCount:0,
      failureCount:0,
      invalidTokens:[],
      errors:[{code:"messaging/no-tokens",message:"No registered FCM device tokens."}]
    };
  }

  const app=firebaseApp();
  if(!app){
    return {
      configured:false,
      successCount:0,
      failureCount:unique.length,
      invalidTokens:[],
      errors:[{
        code:"messaging/server-not-configured",
        message:"Firebase Admin is not configured. Add FIREBASE_SERVICE_ACCOUNT_JSON or FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY to the Vercel Production environment."
      }]
    };
  }

  let successCount=0;
  let failureCount=0;
  const invalidTokens:string[]=[];
  const errors:{code:string;message:string}[]=[];

  for(let i=0;i<unique.length;i+=500){
    const batch=unique.slice(i,i+500);

    const message:MulticastMessage={
      tokens:batch,
      notification:{title,body},
      data:{url:data.url||"/",...data},
      android:{
        priority:"high",
        notification:{
          channelId:"numelixa",
          sound:"default",
          defaultSound:true
        }
      }
    };

    try{
      const response=await getMessaging(app).sendEachForMulticast(message);
      successCount+=response.successCount;
      failureCount+=response.failureCount;

      response.responses.forEach((item,index)=>{
        if(item.success)return;

        const code=String(item.error?.code||"unknown");
        const messageText=String(item.error?.message||"FCM send failed");

        if(errors.length<20)errors.push({code,message:messageText});

        if(
          code==="messaging/registration-token-not-registered"||
          code==="messaging/invalid-registration-token"
        ){
          invalidTokens.push(batch[index]);
        }
      });
    }catch(error){
      const messageText=error instanceof Error?error.message:String(error);
      failureCount+=batch.length;
      if(errors.length<20){
        errors.push({
          code:"messaging/send-batch-failed",
          message:messageText
        });
      }
      console.error("[FCM SEND BATCH]",messageText);
    }
  }

  const result={
    configured:true,
    successCount,
    failureCount,
    invalidTokens:[...new Set(invalidTokens)],
    errors
  };

  console.info("[FCM PUSH] send completed", {
    tokenCount:unique.length,
    successCount,
    failureCount,
    errorCount:errors.length
  });

  return result;
}
