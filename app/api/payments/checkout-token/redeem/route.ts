import {NextResponse} from "next/server";
import crypto from "crypto";
import {collection} from "@/lib/mongo";
import {createSession} from "@/lib/auth";

export const runtime="nodejs";
export const dynamic="force-dynamic";

export async function POST(req:Request){
 try{
  const body=await req.json().catch(()=>({}));
  const token=String(body?.token||"").trim();
  if(!/^[A-Za-z0-9_-]{40,80}$/.test(token))return NextResponse.json({ok:false,error:"Checkout link is invalid or expired. Return to Coin Store and try again."},{status:400,headers:{"Cache-Control":"no-store"}});
  const tokenHash=crypto.createHash("sha256").update(token).digest("hex");
  const tokens=await collection<any>("checkoutTokens");
  const row=await tokens.findOneAndUpdate(
   {tokenHash,purpose:"binance_coin_checkout",usedAt:null,expiresAt:{$gt:new Date()}},
   {$set:{usedAt:new Date()}},
   {returnDocument:"after"}
  );
  if(!row)return NextResponse.json({ok:false,error:"Checkout link has expired or already been used. Return to Coin Store and try again."},{status:401,headers:{"Cache-Control":"no-store"}});
  await createSession(String(row.userId));
  return NextResponse.json({ok:true},{headers:{"Cache-Control":"no-store","Referrer-Policy":"no-referrer"}});
 }catch(e){
  console.error("[CHECKOUT TOKEN REDEEM]",e);
  return NextResponse.json({ok:false,error:"Unable to verify secure checkout. Return to Coin Store and try again."},{status:500,headers:{"Cache-Control":"no-store"}});
 }
}
