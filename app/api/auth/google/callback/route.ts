import {NextResponse} from "next/server";
import {cookies} from "next/headers";
import {collection,mongoId} from "@/lib/mongo";
import {createSession,requestMeta,ensureAdmin} from "@/lib/auth";
import {claimDeviceTokenForUser} from "@/lib/notifications";
import {issueApiKey} from "@/lib/api-key";
export const runtime="nodejs";export const dynamic="force-dynamic";
function safeNext(value:string){return value.startsWith("/")&&!value.startsWith("//")&&!value.includes("\\")?value:"/dashboard"}
function fail(req:Request,reason:string){return NextResponse.redirect(new URL("/login?error="+encodeURIComponent(reason),req.url))}
export async function GET(req:Request){
 const jar=await cookies(),url=new URL(req.url),code=url.searchParams.get("code")||"",state=url.searchParams.get("state")||"";
 const expected=jar.get("numelixa_google_state")?.value||"",next=safeNext(jar.get("numelixa_google_next")?.value||"/dashboard"),termsVersion=jar.get("numelixa_google_terms")?.value||"";
 if(!code||!state||!expected||state!==expected)return fail(req,"google_state");
 const clientId=String(process.env.GOOGLE_CLIENT_ID||"").trim(),clientSecret=String(process.env.GOOGLE_CLIENT_SECRET||"").trim();
 if(!clientId||!clientSecret)return fail(req,"google_not_configured");
 const redirectUri=String(process.env.GOOGLE_REDIRECT_URI||new URL("/api/auth/google/callback",url.origin).toString()).trim();
 try{
  const tokenResponse=await fetch("https://oauth2.googleapis.com/token",{method:"POST",headers:{"Content-Type":"application/x-www-form-urlencoded"},body:new URLSearchParams({code,client_id:clientId,client_secret:clientSecret,redirect_uri:redirectUri,grant_type:"authorization_code"}),cache:"no-store"});
  const token=await tokenResponse.json();
  if(!tokenResponse.ok||!token.access_token)return fail(req,"google_token");
  const profileResponse=await fetch("https://openidconnect.googleapis.com/v1/userinfo",{headers:{Authorization:"Bearer "+String(token.access_token)},cache:"no-store"});
  const profile=await profileResponse.json(),email=String(profile.email||"").trim().toLowerCase();
  if(!profileResponse.ok||!email||profile.email_verified!==true||!profile.sub)return fail(req,"google_email");
  if(email===(process.env.ADMIN_EMAIL||"").trim().toLowerCase())await ensureAdmin();
  const users=await collection<any>("users");let user=await users.findOne({email});
  if(!user&&termsVersion!=="2026-10-10")return fail(req,"terms_required");
  if(user){
   await users.updateOne({_id:user._id},{$set:{emailVerified:true,verifiedAt:user.verifiedAt||new Date(),googleSub:String(profile.sub),authProvider:"google",name:user.name||String(profile.name||email.split("@")[0]),picture:String(profile.picture||"")}});
   user=await users.findOne({_id:user._id});
  }else{
   const id=mongoId(),now=new Date();
   const created={_id:id,email,name:String(profile.name||email.split("@")[0]),role:email===(process.env.ADMIN_EMAIL||"").trim().toLowerCase()?"admin":"user",coins:0,verifiedAt:now,emailVerified:true,googleSub:String(profile.sub),authProvider:"google",picture:String(profile.picture||""),createdAt:now,termsAcceptedAt:termsVersion==="2026-10-10"?now:undefined,termsVersion:termsVersion==="2026-10-10"?"2026-10-10":undefined,privacyPolicyAcknowledgedAt:termsVersion==="2026-10-10"?now:undefined};
   await users.insertOne(created);user=created;
   await issueApiKey(String(id),"Production API key");
  }
  const userId=String(user._id);await createSession(userId,requestMeta(req.headers));await claimDeviceTokenForUser(userId);
  const response=NextResponse.redirect(new URL(next,url.origin));
  response.cookies.delete("numelixa_google_state");response.cookies.delete("numelixa_google_next");response.cookies.delete("numelixa_google_terms");
  return response;
 }catch(error){console.error("[GOOGLE OAUTH]",error instanceof Error?error.message:String(error));return fail(req,"google_login_failed")}
}
