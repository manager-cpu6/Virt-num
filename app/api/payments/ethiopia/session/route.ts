import {NextResponse} from "next/server";
import crypto from "crypto";
import {requireUser,tokenHash} from "@/lib/auth";
import {collection,mongoId} from "@/lib/mongo";
export const runtime="nodejs";
export const dynamic="force-dynamic";
// Short-lived, single-use bridge from the authenticated wallet domain to the
// separate Ethiopia checkout domain. Only the hash is persisted.
export async function POST(){
 try{
  const user=await requireUser();
  if(!user.verified_at)return NextResponse.json({ok:false,error:"Verify your email before topping up."},{status:403});
  const token=crypto.randomBytes(32).toString("base64url"),now=new Date();
  await (await collection<any>("paymentCheckoutSessions")).insertOne({
   _id:mongoId(),tokenHash:tokenHash(token),userId:String(user.id),
   purpose:"ethiopia_wallet_topup",createdAt:now,expiresAt:new Date(now.getTime()+10*60*1000),usedAt:null
  });
  return NextResponse.json({ok:true,token,expiresInSeconds:600},{headers:{"Cache-Control":"no-store"}});
 }catch(error){
  if(error instanceof Error&&error.message==="AUTH_REQUIRED")return NextResponse.json({ok:false,error:"Please sign in to your wallet first."},{status:401});
  console.error("[ETHIOPIA CHECKOUT SESSION]",error);
  return NextResponse.json({ok:false,error:"Unable to start secure checkout."},{status:500});
 }
}
