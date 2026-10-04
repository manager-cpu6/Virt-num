import {getApps,initializeApp,cert} from "firebase-admin/app";
import {getMessaging} from "firebase-admin/messaging";
function firebaseApp(){
 const projectId=process.env.FIREBASE_PROJECT_ID,clientEmail=process.env.FIREBASE_CLIENT_EMAIL,privateKey=process.env.FIREBASE_PRIVATE_KEY?.replace(/\\n/g,"\n");
 if(!projectId||!clientEmail||!privateKey)return null;
 return getApps()[0]||initializeApp({credential:cert({projectId,clientEmail,privateKey})});
}
export async function sendPush(tokens:string[],title:string,body:string){
 const app=firebaseApp();if(!app||!tokens.length)return {configured:Boolean(app),successCount:0,failureCount:0};
 const unique=[...new Set(tokens.filter(Boolean))].slice(0,500);
 const response=await getMessaging(app).sendEachForMulticast({tokens:unique,notification:{title,body},data:{url:"/notifications"}});
 return {configured:true,successCount:response.successCount,failureCount:response.failureCount};
}
