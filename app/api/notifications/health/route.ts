import {NextResponse} from "next/server";
import {isFirebaseConfigured} from "@/lib/push";
import {getFirebaseServerSettings,getSavedFirebaseSettings} from "@/lib/firebase-settings";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function GET(){
 let settings={projectId:"",clientEmail:"",privateKey:""};
 let saved=false;
 try{settings=await getFirebaseServerSettings();saved=Boolean(await getSavedFirebaseSettings())}catch{}
 const clientEmail=String(settings.clientEmail||"").trim();
 const serviceAccountProjectMatch=clientEmail.endsWith("@numelixa.iam.gserviceaccount.com");
 const configuredProject=String(settings.projectId||"").trim();
 let firebaseAdminReady=false;
 try{firebaseAdminReady=await isFirebaseConfigured()}catch{}
 return NextResponse.json({
  ok:true,
  databaseConfigured:Boolean(String(process.env.MONGODB_URI||"").trim()),
  firebaseAdminConfigured:firebaseAdminReady,
  firebaseAdminCredentialsPresent:Boolean(clientEmail&&settings.privateKey),
  firebaseAdminMode:saved?"encrypted_admin_settings":clientEmail&&settings.privateKey?"environment":"missing",
  firebaseProjectExpected:"numelixa",
  firebaseProjectIdMatches:configuredProject==="numelixa",
  serviceAccountProjectMatch:firebaseParts?serviceAccountProjectMatch:null,
  androidFirebaseClientConfigured:null,
  androidFirebaseClientConfig:"Bundled in the Android APK; token registration and real delivery must be verified on a device",
  registrationEndpoint:"/api/notifications/register"
 },{headers:{"Cache-Control":"no-store"}});
}
