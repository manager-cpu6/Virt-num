import {NextResponse} from "next/server";

export const runtime="nodejs";
export const dynamic="force-dynamic";

export async function GET(){
 const firebaseServiceJson=String(process.env.FIREBASE_SERVICE_ACCOUNT_JSON||process.env.FIREBASE_SERVICE_ACCOUNT||"").trim();
 const firebaseParts=Boolean(
  String(process.env.FIREBASE_PROJECT_ID||"").trim() &&
  String(process.env.FIREBASE_CLIENT_EMAIL||"").trim() &&
  String(process.env.FIREBASE_PRIVATE_KEY||"").trim()
 );

 return NextResponse.json({
  ok:true,
  databaseConfigured:Boolean(String(process.env.MONGODB_URI||"").trim()),
  firebaseAdminConfigured:Boolean(firebaseServiceJson||firebaseParts),
  firebaseAdminMode:firebaseServiceJson?"service_account_json":firebaseParts?"split_credentials":"missing",
  androidFirebaseClientConfigured:true,
  registrationEndpoint:"/api/notifications/register"
 },{headers:{"Cache-Control":"no-store"}});
}
