import {NextResponse} from "next/server";
import crypto from "crypto";
import {collection,mongoId} from "@/lib/mongo";
import {ensureApiKey} from "@/lib/api-key";

export const runtime="nodejs";
export const dynamic="force-dynamic";

const hash=(v:string)=>crypto.createHash("sha256").update(v).digest("hex");
const APP_CALLBACK="com.numelixa.app://auth/callback";
const REDIRECT_URI="https://numelixa.com/api/auth/google/native/callback";

function fail(message:string,status=400){
 const url=new URL(APP_CALLBACK);url.searchParams.set("error",message);
 return NextResponse.redirect(url,status);
}

export async function GET(req:Request){
 const requestUrl=new URL(req.url);
 const code=String(requestUrl.searchParams.get("code")||"");
 const state=String(requestUrl.searchParams.get("state")||"");
 const oauthError=String(requestUrl.searchParams.get("error")||"");
 if(oauthError)return fail(oauthError==="access_denied"?"cancelled":"google_error");
 if(!code||!state)return fail("missing_oauth_response");
 try{
  const states=await collection<any>("googleNativeOAuthStates");
  const stateRecord=await states.findOne({stateHash:hash(state),expiresAt:{$gt:new Date()}});
  if(!stateRecord)return fail("expired_oauth_state");
  await states.deleteOne({_id:stateRecord._id});

  const clientId=String(process.env.GOOGLE_CLIENT_ID||"").trim();
  const clientSecret=String(process.env.GOOGLE_CLIENT_SECRET||"").trim();
  if(!clientId||!clientSecret)return fail("google_oauth_not_configured",500);

  const tokenResponse=await fetch("https://oauth2.googleapis.com/token",{
   method:"POST",cache:"no-store",headers:{"Content-Type":"application/x-www-form-urlencoded"},
   body:new URLSearchParams({code,client_id:clientId,client_secret:clientSecret,redirect_uri:REDIRECT_URI,grant_type:"authorization_code"})
  });
  const tokenData=await tokenResponse.json().catch(()=>({}));
  const idToken=String(tokenData.id_token||"");
  if(!tokenResponse.ok||!idToken)return fail("google_token_exchange_failed",401);

  const verify=await fetch("https://oauth2.googleapis.com/tokeninfo?id_token="+encodeURIComponent(idToken),{cache:"no-store"});
  if(!verify.ok)return fail("google_token_invalid",401);
  const profile=await verify.json() as {aud?:string;sub?:string;email?:string;email_verified?:string|boolean;name?:string};
  const email=String(profile.email||"").trim().toLowerCase();
  const googleId=String(profile.sub||"").trim();
  const verified=profile.email_verified===true||String(profile.email_verified).toLowerCase()==="true";
  if(String(profile.aud||"")!==clientId||!googleId||!email.includes("@")||!verified)return fail("google_account_not_verified",401);

  const users=await collection<any>("users");
  const linked=await users.findOne({googleId});
  if(linked&&String(linked.email||"").toLowerCase()!==email)return fail("google_account_conflict",409);
  let user=linked||await users.findOne({email});
  if(user?.suspendedAt)return fail("account_suspended",403);
  const now=new Date();
  if(!user){
   user={_id:mongoId(),email,name:String(profile.name||email.split("@")[0]).slice(0,100),role:"user",coins:0,verifiedAt:now,googleId,createdAt:now};
   await users.insertOne(user);
  }else{
   await users.updateOne({_id:user._id},{$set:{googleId,verifiedAt:user.verifiedAt||now,name:user.name||String(profile.name||email.split("@")[0]).slice(0,100),updatedAt:now}});
  }
  const userId=String(user._id);
  await ensureApiKey(userId);
  const ticket=crypto.randomBytes(32).toString("hex");
  await (await collection<any>("googleNativeOAuthTickets")).insertOne({
   _id:crypto.randomUUID(),ticketHash:hash(ticket),userId,createdAt:now,expiresAt:new Date(now.getTime()+3*60*1000)
  });
  const callback=new URL(APP_CALLBACK);
  callback.searchParams.set("ticket",ticket);
  return NextResponse.redirect(callback.toString());
 }catch(error){
  console.error("[NATIVE GOOGLE CALLBACK]",error);
  return fail("google_sign_in_failed",500);
 }
}
