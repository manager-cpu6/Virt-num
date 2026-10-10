import {NextResponse} from "next/server";
import {collection,mongoId} from "@/lib/mongo";
import {createSession,requestMeta} from "@/lib/auth";
import {claimDeviceTokenForUser} from "@/lib/notifications";
import {ensureApiKey} from "@/lib/api-key";

export const runtime="nodejs";
export const dynamic="force-dynamic";

export async function POST(req:Request){
 try{
  const body=await req.json().catch(()=>null);
  const credential=String(body?.credential||"").trim();
  if(!credential)return NextResponse.json({ok:false,error:"Google sign-in token is missing."},{status:400});
  const clientId=String(process.env.GOOGLE_CLIENT_ID||process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID||"").trim();
  if(!clientId)return NextResponse.json({ok:false,error:"Google sign-in is not configured yet."},{status:503});

  const verify=await fetch("https://oauth2.googleapis.com/tokeninfo?id_token="+encodeURIComponent(credential),{cache:"no-store"});
  if(!verify.ok)return NextResponse.json({ok:false,error:"Google could not verify this sign-in. Please try again."},{status:401});
  const profile=await verify.json() as {aud?:string;sub?:string;email?:string;email_verified?:string|boolean;name?:string};
  const email=String(profile.email||"").trim().toLowerCase();
  const googleId=String(profile.sub||"").trim();
  const audience=String(profile.aud||"").trim();
  const verified=profile.email_verified===true||String(profile.email_verified).toLowerCase()==="true";
  if(audience!==clientId||!googleId||!email.includes("@")||!verified){
   return NextResponse.json({ok:false,error:"Google account verification failed. Use a verified Google account."},{status:401});
  }

  const users=await collection<any>("users");
  const linked=await users.findOne({googleId});
  if(linked&&String(linked.email||"").toLowerCase()!==email){
   return NextResponse.json({ok:false,error:"This Google account is linked to another email."},{status:409});
  }
  let user=linked||await users.findOne({email});
  const now=new Date();
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
  await createSession(id,requestMeta(req.headers));
  await claimDeviceTokenForUser(id);
  return NextResponse.json({ok:true,role:user.role||"user"});
 }catch(error){
  console.error("[GOOGLE SIGN IN]",error instanceof Error?error.message:String(error));
  return NextResponse.json({ok:false,error:"Unable to sign in with Google right now."},{status:500});
 }
}
