import {NextResponse} from "next/server";
import {requireAdmin} from "@/lib/auth";
import {collection} from "@/lib/mongo";
import {encryptFirebaseSettings,getFirebaseServerSettings,getSavedFirebaseSettings} from "@/lib/firebase-settings";

export const runtime="nodejs";
export const dynamic="force-dynamic";
const ANDROID_PACKAGE="com.numelixa.app";
const FIREBASE_APP_ID="1:832390289699:android:963bd5705215947fb51496";
const PROJECT_NUMBER="832390289699";

export async function GET(){
 try{
  await requireAdmin();
  const [active,saved]=await Promise.all([getFirebaseServerSettings(),getSavedFirebaseSettings().catch(()=>null)]);
  return NextResponse.json({
   ok:true,
   projectId:active.projectId||"numelixa",
   clientEmail:active.clientEmail||"",
   privateKeyConfigured:Boolean(active.privateKey),
   privateKeyStored:Boolean(saved?.privateKey),
   privateKeyMasked:active.privateKey?"••••••••••••••••":"", 
   encryptionReady:String(process.env.FIREBASE_SETTINGS_ENCRYPTION_KEY||"").trim().length>=32,
   androidPackage:ANDROID_PACKAGE,
   firebaseAppId:FIREBASE_APP_ID,
   projectNumber:PROJECT_NUMBER,
   source:saved?"encrypted-admin-settings":"environment"
  },{headers:{"Cache-Control":"no-store"}});
 }catch(error){
  const message=error instanceof Error?error.message:String(error);
  const status=message==="AUTH_REQUIRED"||message==="ADMIN_REQUIRED"?401:500;
  return NextResponse.json({ok:false,error:status===401?"Unauthorized":message.includes("FIREBASE_SETTINGS_ENCRYPTION_KEY")?message:"Unable to load Firebase settings."},{status,headers:{"Cache-Control":"no-store"}});
 }
}

export async function PUT(req:Request){
 try{
  await requireAdmin();
  const body=await req.json().catch(()=>null);
  if(!body)return NextResponse.json({ok:false,error:"Invalid JSON body."},{status:400});
  if(String(process.env.FIREBASE_SETTINGS_ENCRYPTION_KEY||"").trim().length<32){
   return NextResponse.json({ok:false,error:"Add FIREBASE_SETTINGS_ENCRYPTION_KEY (at least 32 characters) to Vercel Production and redeploy before saving credentials. The private key will be encrypted before storage."},{status:503});
  }
  const projectId=String(body.projectId||"").trim();
  const clientEmail=String(body.clientEmail||"").trim();
  let privateKey=String(body.privateKey||"").replace(/\\n/g,"\n").replace(/\r\n/g,"\n").trim();
  const previous=await getFirebaseServerSettings();
  if(!privateKey)privateKey=previous.privateKey;
  if(projectId!=="numelixa"){
   return NextResponse.json({ok:false,error:"This APK's google-services.json is registered to Firebase project numelixa. Changing the server project requires updating the Android Firebase app registration and rebuilding the APK first."},{status:400});
  }
  if(!clientEmail.endsWith("@numelixa.iam.gserviceaccount.com")){
   return NextResponse.json({ok:false,error:"Use the service-account email belonging to the numelixa Firebase project."},{status:400});
  }
  if(!privateKey.includes("BEGIN PRIVATE KEY")||!privateKey.includes("END PRIVATE KEY")){
   return NextResponse.json({ok:false,error:"Paste the complete PEM private key, including BEGIN/END PRIVATE KEY lines."},{status:400});
  }
  const encrypted=encryptFirebaseSettings({projectId,clientEmail,privateKey});
  await (await collection<any>("firebaseSettings")).updateOne(
   {_id:"active"},
   {$set:{_id:"active",encrypted,updatedAt:new Date(),updatedBy:"admin"}},
   {upsert:true}
  );
  console.info("[FCM_SETTINGS_UPDATED]",{projectId,clientEmailDomain:clientEmail.split("@").pop(),privateKeyStoredEncrypted:true});
  return NextResponse.json({ok:true,saved:true,projectId,clientEmail,privateKeyConfigured:true,privateKeyMasked:"••••••••••••••••",message:"Firebase server credentials encrypted and saved. Test with the admin device button; rotate credentials if delivery fails."},{headers:{"Cache-Control":"no-store"}});
 }catch(error){
  const message=error instanceof Error?error.message:String(error);
  const status=message==="AUTH_REQUIRED"||message==="ADMIN_REQUIRED"?401:500;
  console.error("[FCM_SETTINGS_SAVE_FAILURE]",{message:message.includes("PRIVATE KEY")?message:"Firebase settings save failed"});
  return NextResponse.json({ok:false,error:status===401?"Unauthorized":message.includes("FIREBASE_SETTINGS_ENCRYPTION_KEY")?message:"Unable to save Firebase settings. Check server configuration."},{status,headers:{"Cache-Control":"no-store"}});
 }
}
