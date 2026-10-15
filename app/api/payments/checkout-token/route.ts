import {NextResponse} from "next/server";
import crypto from "crypto";
import {requireUser} from "@/lib/auth";
import {collection,mongoId} from "@/lib/mongo";

export const runtime="nodejs";
export const dynamic="force-dynamic";

export async function POST(){
 try{
  const user=await requireUser();
  const raw=crypto.randomBytes(32).toString("base64url");
  const now=new Date();
  await (await collection<any>("checkoutTokens")).insertOne({
   _id:mongoId(),
   tokenHash:crypto.createHash("sha256").update(raw).digest("hex"),
   userId:String(user.id),
   purpose:"binance_coin_checkout",
   createdAt:now,
   expiresAt:new Date(now.getTime()+5*60*1000),
   usedAt:null
  });
  return NextResponse.json({ok:true,token:raw,expiresIn:300},{headers:{"Cache-Control":"no-store","Referrer-Policy":"no-referrer"}});
 }catch(e){
  if(e instanceof Error&&e.message==="AUTH_REQUIRED")return NextResponse.json({ok:false,error:"Please sign in to Numelixa first."},{status:401});
  console.error("[CHECKOUT TOKEN CREATE]",e);
  return NextResponse.json({ok:false,error:"Unable to start secure checkout. Please try again."},{status:500});
 }
}
