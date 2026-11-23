import {NextResponse} from "next/server";
import {collection,mongoId} from "@/lib/mongo";
import {createSession,requestMeta} from "@/lib/auth";
import {claimDeviceTokenForUser} from "@/lib/notifications";
import {ensureApiKey} from "@/lib/api-key";
import {sendTransactionalEmail} from "@/lib/email-system";
import {notifyNewLogin} from "@/lib/login-security";
import {systemControlMessage} from "@/lib/system-controls";

export const runtime="nodejs";
export const dynamic="force-dynamic";

export async function POST(req:Request){
 try{
  const body=await req.json().catch(()=>null);
  const credential=String(body?.credential||"").trim();
  if(!credential)return NextResponse.json({ok:false,error:"Google sign-in token is missing."},{status:400});
  const allowedClientIds=[process.env.GOOGLE_CLIENT_ID,process.env.GOOGLE_WEB_CLIENT_ID].map(value=>String(value||"").trim()).filter(Boolean);
  if(!allowedClientIds.length)return NextResponse.json({ok:false,error:"Google sign-in is not configured yet."},{status:503});

  const verify=await fetch("https://oauth2.googleapis.com/tokeninfo?id_token="+encodeURIComponent(credential),{cache:"no-store"});
  if(!verify.ok)return NextResponse.json({ok:false,error:"Google could not verify this sign-in. Please try again."},{status:401});
  const profile=await verify.json() as {aud?:string;sub?:string;email?:string;email_verified?:string|boolean;name?:string;iss?:string;exp?:string|number};
  const email=String(profile.email||"").trim().toLowerCase();
  const googleId=String(profile.sub||"").trim();
  const audience=String(profile.aud||"").trim();
  const issuer=String(profile.iss||"").trim();
  const expiresAt=Number(profile.exp||0);
  const verified=profile.email_verified===true||String(profile.email_verified).toLowerCase()==="true";
  const issuerValid=issuer==="accounts.google.com"||issuer==="https://accounts.google.com";
  if(!allowedClientIds.includes(audience)||!issuerValid||!Number.isFinite(expiresAt)||expiresAt<=Math.floor(Date.now()/1000)||!googleId||!email.includes("@")||!verified){
   return NextResponse.json({ok:false,error:"Google account verification failed. Use a verified Google account."},{status:401});
  }

  const users=await collection<any>("users");
  const linked=await users.findOne({googleId});
  if(linked&&String(linked.email||"").toLowerCase()!==email){
   return NextResponse.json({ok:false,error:"This Google account is linked to another email."},{status:409});
  }
  let user=linked||await users.findOne({email});
  if(user?.suspendedAt)return NextResponse.json({ok:false,code:"ACCOUNT_SUSPENDED",error:"Your Numelixa account is suspended. Reason: "+String(user.suspensionReason||"Your account requires review.")+" If you believe this is a mistake, contact https://support.numelixa.com to request a review."},{status:403});
  const now=new Date();
  const createdAccount=!user;
  if(createdAccount){const paused=await systemControlMessage("stopNewUsers");if(paused)return NextResponse.json({ok:false,code:"NEW_USERS_STOPPED",error:paused},{status:503});}
  if(!user){
   const id=mongoId();
   user={_id:id,email,name:String(profile.name||email.split("@")[0]).slice(0,100),role:"user",coins:0,verifiedAt:now,googleId,createdAt:now};
   await users.insertOne(user);
  }else{
   await users.updateOne({_id:user._id},{$set:{
    googleId,verifiedAt:user.verifiedAt||now,
    name:user.name||String(profile.name||email.split("@")[0]).slice(0,100),
    updatedAt:now
   }});
  }

  const id=String(user._id);
  await ensureApiKey(id);
  if(createdAccount){try{await sendTransactionalEmail("welcome",email,{USER_NAME:String(user.name||profile.name||email.split("@")[0]),YEAR:new Date().getFullYear()},"welcome:"+id);}catch(error){console.error("[GOOGLE WELCOME EMAIL]",error instanceof Error?error.message:String(error));}}
  await createSession(id,requestMeta(req.headers));
  await claimDeviceTokenForUser(id);
  if(user.email&&!createdAccount)await notifyNewLogin(id,String(user.email),String(user.name||profile.name||"there"),req.headers);
  return NextResponse.json({ok:true,role:user.role||"user"});
 }catch(error){
  console.error("[GOOGLE SIGN IN]",error instanceof Error?error.message:String(error));
  return NextResponse.json({ok:false,error:"Unable to sign in with Google right now."},{status:500});
 }
}
