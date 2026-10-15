import {NextResponse} from "next/server";
import {requireUser} from "@/lib/auth";
import {collection} from "@/lib/mongo";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function GET(req:Request){
 try{
  const user=await requireUser(),orderId=new URL(req.url).searchParams.get("orderId")||"";
  if(!orderId)return NextResponse.json({ok:false,error:"Payment order is required."},{status:400});
  let p=await (await collection<any>("payments")).findOne({orderId,provider:"binance_personal",userId:String(user.id)});
  if(!p)return NextResponse.json({ok:false,error:"Payment request was not found."},{status:404});
  if(p.status==="pending"){
   const secret=String(process.env.CRON_SECRET||process.env.NUMELIXA_CRON_SECRET||"").trim();
   if(secret){
    try{await fetch(new URL("/api/cron/binance-deposits",req.url),{method:"GET",headers:{authorization:"Bearer "+secret},cache:"no-store"});}
    catch(e){console.error("[BINANCE MANUAL CHECK SYNC]",e instanceof Error?e.message:"sync failed");}
    p=await (await collection<any>("payments")).findOne({orderId,provider:"binance_personal",userId:String(user.id)});
   }
  }
  let status=String(p.status);
  if(status==="pending"&&p.createdAt&&new Date(p.createdAt).getTime()<=Date.now()-24*60*60*1000&&p.expiresAt&&new Date(p.expiresAt).getTime()<=Date.now()){
   await (await collection<any>("payments")).updateOne({_id:p._id,provider:"binance_personal",status:"pending",expiresAt:{$lte:new Date()}},{$set:{status:"expired",updatedAt:new Date()}});
   status="expired";
  }
  return NextResponse.json({ok:true,status,coins:Number(p.coins),amount:Number(p.amountCrypto),expiresAt:p.expiresAt||null,paidAt:p.paidAt||null});
 }catch(e){
  if(e instanceof Error&&e.message==="AUTH_REQUIRED")return NextResponse.json({ok:false,error:"Please sign in."},{status:401});
  return NextResponse.json({ok:false,error:"Unable to check deposit status."},{status:500});
 }
}
