import {NextResponse} from "next/server";
import crypto from "crypto";
export const runtime="nodejs";
export async function GET(req:Request){
 const clientId=String(process.env.GOOGLE_CLIENT_ID||"").trim();
 if(!clientId)return NextResponse.redirect(new URL("/login?error=google_not_configured",req.url));
 const url=new URL(req.url),requested=url.searchParams.get("next")||"/dashboard";
 const next=requested.startsWith("/")&&!requested.startsWith("//")&&!requested.includes("\\")?requested:"/dashboard";
 const state=crypto.randomBytes(24).toString("hex");
 const redirectUri=String(process.env.GOOGLE_REDIRECT_URI||new URL("/api/auth/google/callback",url.origin).toString()).trim();
 const google=new URL("https://accounts.google.com/o/oauth2/v2/auth");
 google.searchParams.set("client_id",clientId);google.searchParams.set("redirect_uri",redirectUri);
 google.searchParams.set("response_type","code");google.searchParams.set("scope","openid email profile");
 google.searchParams.set("state",state);google.searchParams.set("prompt","select_account");
 const response=NextResponse.redirect(google),secure=process.env.NODE_ENV==="production";
 response.cookies.set("numelixa_google_state",state,{httpOnly:true,secure,sameSite:"lax",path:"/",maxAge:600});
 response.cookies.set("numelixa_google_next",next,{httpOnly:true,secure,sameSite:"lax",path:"/",maxAge:600});
 return response;
}
