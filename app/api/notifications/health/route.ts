import {NextResponse} from "next/server";
import {isFirebaseConfigured} from "@/lib/push";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function GET(){
 const firebaseServiceJson=String(process.env.FIREBASE_SERVICE_ACCOUNT_JSON||process.env.FIREBASE_SERVICE_ACCOUNT||"").trim();
 const firebaseParts=Boolean(String(process.env.FIREBASE_CLIENT_EMAIL||"").trim()&&String(process.env.FIREBASE_PRIVATE_KEY||"").trim());
 const clientEmail=String(process.env.FIREBASE_CLIENT_EMAIL||"").trim();
 const serviceAccountProjectMatch=clientEmail.endsWith("@numelixa.iam.gserviceaccount.com");
 const configuredProject=String(process.env.FIREBASE_PROJECT_ID||"numelixa").trim();
 let firebaseAdminReady=false;
 try{firebaseAdminReady=await isFirebaseConfigured()}catch{}
 return NextResponse.json({
  ok:true,
  databaseConfigured:Boolean(String(process.env.MONGODB_URI||"").trim()),
  firebaseAdminConfigured:firebaseAdminReady,
  firebaseAdminCredentialsPresent:Boolean(firebaseServiceJson||firebaseParts),
  firebaseAdminMode:firebaseServiceJson?"service_account_json":firebaseParts?"split_credentials":"missing",
  firebaseProjectExpected:"numelixa",
  firebaseProjectIdMatches:configuredProject==="numelixa",
  serviceAccountProjectMatch:firebaseParts?serviceAccountProjectMatch:null,
  androidFirebaseClientConfigured:null,
  androidFirebaseClientConfig:"Bundled in the Android APK; token registration and real delivery must be verified on a device",
  registrationEndpoint:"/api/notifications/register"
 },{headers:{"Cache-Control":"no-store"}});
}
