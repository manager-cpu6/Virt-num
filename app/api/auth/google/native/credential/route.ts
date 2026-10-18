import {NextResponse} from "next/server";
import crypto from "crypto";
import {collection,mongoId} from "@/lib/mongo";
import {ensureApiKey} from "@/lib/api-key";

export const runtime="nodejs";
export const dynamic="force-dynamic";
const hash=(v:string)=>crypto.createHash("sha256").update(v).digest("hex");

export async function POST(req:Request){
 try{
  const body=await req.json().catch(()=>null);
  const credential=String(body?.credential||"").trim();
  const clientId=String(process.env.GOOGLE_WEB_CLIENT_ID||process.env.GOOGLE_CLIENT_ID||"").trim();
  if(!credential||!clientId)return NextResponse.json({ok:false,error:"Google sign-in is not configured. Please contact support."},{status:503});
  const verify=await fetch("https://oauth2.googleapis.com/tokeninfo?id_token="+encodeURIComponent(credential),{cache:"no-store"});
  if(!verify.ok)return NextResponse.json({ok:false,error:"Google could not verify this sign-in. Please try again."},{status:401});
  const profile=await verify.json() as {aud?:string;sub?:string;email?:string;email_verified?:string|boolean;name?:string;picture?:string};
  const email=String(profile.email||"").trim().toLowerCase();
  const googleId=String(profile.sub||"").trim();
  const verified=profile.email_verified===true||String(profile.email_verified).toLowerCase()==="true";
  if(String(profile.aud||"").trim()!==clientId||!googleId||!email.includes("@")||!verified)
   return NextResponse.json({ok:false,error:"Google account verification failed. Choose a verified Google account."},{status:401});
  const users=await collection<any>("users");
  const linked=await users.findOne({googleId});
  if(linked&&String(linked.email||"").toLowerCase()!==email)
   return NextResponse.json({ok:false,error:"This Google account is linked to another email."},{status:409});
  let user=linked||await users.findOne({email});
  if(user?.suspendedAt)
   return NextResponse.json({ok:false,error:"This account is suspended. Contact Numelixa Support."},{status:403});
  const now=new Date();
  if(!user){
   user={_id:mongoId(),email,name:String(profile.name||email.split("@")[0]).slice(0,100),avatarUrl:String(profile.picture||"").slice(0,2048),role:"user",coins:0,verifiedAt:now,googleId,createdAt:now};
   await users.insertOne(user);
  }else{
   await users.updateOne({_id:user._id},{$set:{googleId,verifiedAt:user.verifiedAt||now,name:user.name||String(profile.name||email.split("@")[0]).slice(0,100),avatarUrl:user.avatarUrl||String(profile.picture||"").slice(0,2048),updatedAt:now}});
  }
  const userId=String(user._id);
  await ensureApiKey(userId);
  const ticket=crypto.randomBytes(32).toString("hex");
  await (await collection<any>("googleNativeOAuthTickets")).insertOne({_id:crypto.randomUUID(),ticketHash:hash(ticket),userId,createdAt:now,expiresAt:new Date(now.getTime()+3*60*1000)});
  return NextResponse.json({ok:true,ticket},{headers:{"Cache-Control":"no-store"}});
 }catch(error){
  console.error("[NATIVE GOOGLE CREDENTIAL]",error instanceof Error?error.message:String(error));
  return NextResponse.json({ok:false,error:"Unable to finish Google sign-in. Please try again."},{status:500});
 }
}
