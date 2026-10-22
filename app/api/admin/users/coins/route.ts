import {NextResponse} from "next/server";
import {requireAdmin} from "@/lib/auth";
import {collection,mongoId} from "@/lib/mongo";
import {getSettings} from "@/lib/settings";
import {notifyUser} from "@/lib/notifications";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function POST(req:Request){
 try{
  await requireAdmin();
  const b=await req.json(),userId=String(b.userId||""),mode=String(b.mode||"add"),amountUsd=Number(b.amountUsd);
  if(!userId||!["add","remove","set"].includes(mode)||!Number.isFinite(amountUsd)||amountUsd<0||Math.abs(Math.round(amountUsd*100)/100-amountUsd)>0.000001)return NextResponse.json({ok:false,error:"Enter a valid USD wallet amount."},{status:400});
  const pricing=await getSettings(),rate=Number(pricing.coinsPerUsd)||100,amount=Math.round(amountUsd*rate);
  const users=await collection<any>("users"),u=await users.findOne({_id:userId});
  if(!u)return NextResponse.json({ok:false,error:"User not found."},{status:404});
  const current=Number(u.coins||0),next=mode==="add"?current+amount:mode==="remove"?Math.max(0,current-amount):amount,delta=next-current;
  await users.updateOne({_id:userId},{$set:{coins:next,updatedAt:new Date()}});
  await (await collection<any>("coinTransactions")).insertOne({_id:mongoId(),userId,type:"admin_adjustment",amount:delta,balanceAfter:next,createdAt:new Date(),description:"Admin wallet balance adjustment (USD)"});
  const deltaUsd=Math.abs(delta/rate).toFixed(2),balanceUsd=(next/rate).toFixed(2);
  if(delta!==0){
   try{await notifyUser(userId,"Wallet balance updated",delta>0?"$"+deltaUsd+" USD was added to your Numelixa wallet. New balance: $"+balanceUsd+" USD.":"$"+deltaUsd+" USD was removed from your Numelixa wallet. New balance: $"+balanceUsd+" USD.",{type:"wallet_adjustment",amountUsd:(delta/rate).toFixed(2),balanceUsd});}
   catch(error){console.error("[ADMIN WALLET PUSH]",error);}
  }
  return NextResponse.json({ok:true,coins:next,balanceUsd:Number(balanceUsd),currency:"USD"});
 }catch{return NextResponse.json({ok:false,error:"Unauthorized"},{status:401});}
}
