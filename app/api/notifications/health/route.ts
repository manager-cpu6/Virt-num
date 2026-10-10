import {NextResponse} from "next/server";
import {isFirebaseConfigured} from "@/lib/push";

export const runtime="nodejs";
export const dynamic="force-dynamic";

export async function GET(){
 const firebaseServiceJson=String(process.env.FIREBASE_SERVICE_ACCOUNT_JSON||process.env.FIREBASE_SERVICE_ACCOUNT||"").trim();
 const firebaseParts=Boolean(
  String(process.env.FIREBASE_PROJECT_ID||"").trim() &&
  String(process.env.FIREBASE_CLIENT_EMAIL||"").trim() &&
  String(process.env.FIREBASE_PRIVATE_KEY||"").trim()
 );
 let firebaseAdminConfigured=false;
 let firebaseAdminError:string|null=null;
 try{firebaseAdminConfigured=isFirebaseConfigured()}catch(error){
  firebaseAdminError=error instanceof Error?error.message:"Firebase Admin initialization failed";
 }
 return NextResponse.json({
  ok:true,
  databaseConfigured:Boolean(String(process.env.MONGODB_URI||"").trim()),
  cronConfigured:Boolean(String(process.env.CRON_SECRET||"").trim()),
  firebaseAdminConfigured,
  firebaseAdminCredentialsPresent:Boolean(firebaseServiceJson||firebaseParts),
  firebaseAdminMode:firebaseServiceJson?"service_account_json":firebaseParts?"split_credentials":"missing",
  firebaseAdminError,
  androidFirebaseClientConfigured:true,
  registrationEndpoint:"/api/notifications/register"
 },{headers:{"Cache-Control":"no-store"}});
}
