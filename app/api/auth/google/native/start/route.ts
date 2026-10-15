import {NextResponse} from "next/server";
import crypto from "crypto";
import {collection} from "@/lib/mongo";

export const runtime="nodejs";
export const dynamic="force-dynamic";

const hash=(v:string)=>crypto.createHash("sha256").update(v).digest("hex");

export async function POST(req:Request){
 try{
  const body=await req.json().catch(()=>({}));
  const loginHint=String(body?.loginHint||"").trim().toLowerCase();
  const clientId=String(process.env.GOOGLE_CLIENT_ID||"").trim();
  const clientSecret=String(process.env.GOOGLE_CLIENT_SECRET||"").trim();
  if(!clientId||!clientSecret)return NextResponse.json({ok:false,error:"Google sign-in needs GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET in Vercel. Add https://numelixa.com/api/auth/google/native/callback as an authorized redirect URI in Google Cloud."},{status:503});
  const state=crypto.randomBytes(32).toString("hex");
  await (await collection<any>("googleNativeOAuthStates")).insertOne({
   _id:crypto.randomUUID(),stateHash:hash(state),createdAt:new Date(),
   expiresAt:new Date(Date.now()+10*60*1000)
  });
  const redirectUri="https://numelixa.com/api/auth/google/native/callback";
  const url=new URL("https://accounts.google.com/o/oauth2/v2/auth");
  url.searchParams.set("client_id",clientId);
  url.searchParams.set("redirect_uri",redirectUri);
  url.searchParams.set("response_type","code");
  url.searchParams.set("scope","openid email profile");
  url.searchParams.set("state",state);
  url.searchParams.set("prompt","select_account");
  if(loginHint&&loginHint.includes("@")&&!/\s/.test(loginHint))url.searchParams.set("login_hint",loginHint);
  url.searchParams.set("include_granted_scopes","true");
  return NextResponse.json({ok:true,url:url.toString()},{headers:{"Cache-Control":"no-store"}});
 }catch(error){
  console.error("[NATIVE GOOGLE START]",error);
  return NextResponse.json({ok:false,error:"Unable to start Google sign-in. Please try again."},{status:500});
 }
}
