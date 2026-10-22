import {NextResponse} from "next/server";
import crypto from "crypto";
import {requireUser} from "@/lib/auth";
import {collection,mongoId} from "@/lib/mongo";
import {getSettings} from "@/lib/settings";
export const runtime="nodejs"; export const dynamic="force-dynamic";
const FALLBACK_PACKS={36:0.77,75:1.65,250:5.49,499:10.99} as Record<number,number>;
export async function POST(req:Request){
 try{
  const user=await requireUser();
  if(!user.verified_at)return NextResponse.json({ok:false,error:"Verify your email before buying coins."},{status:403});
  const flags=await (await collection<any>("settings")).findOne({_id:"payments"});
  if(flags?.sifaloLocalOpen!==true)return NextResponse.json({ok:false,error:"Local payments are currently closed. Please choose crypto."},{status:403});
  const apiUser=String(process.env.SIFALO_API_USER||"").trim(),apiKey=String(process.env.SIFALO_API_KEY||"").trim();
  if(!apiUser||!apiKey)return NextResponse.json({ok:false,error:"Local payments are not configured yet."},{status:503});
  const body=await req.json(),coins=Math.floor(Number(body.coins)),settings=await getSettings();
  const pack=settings.coinPackages.find((x:any)=>Number(x.coins)===coins),amount=Number(pack?.priceUsd??FALLBACK_PACKS[coins]);
  if(!Number.isFinite(amount)||amount<=0)return NextResponse.json({ok:false,error:"This coin package is unavailable."},{status:400});
  const orderId="sifalo_"+crypto.randomUUID();
  const base=String(process.env.NEXT_PUBLIC_APP_URL||"https://numelixa.com").replace(/\/$/,"");
  const apiBase=String(process.env.SIFALO_ENV||"live").toLowerCase()==="staging"?"https://spay-api.sifalo.net/gateway/":"https://api.sifalopay.com/gateway/";
  const auth=Buffer.from(apiUser+":"+apiKey).toString("base64");
  const response=await fetch(apiBase,{method:"POST",headers:{Authorization:"Basic "+auth,"Content-Type":"application/json"},body:JSON.stringify({amount:amount.toFixed(2),currency:"USD",gateway:"checkout",order_id:orderId,return_url:base+"/wallet?local_payment=return&order_id="+encodeURIComponent(orderId),webhook_url:base+"/api/payments/sifalo/webhook"}),cache:"no-store",signal:AbortSignal.timeout(25000)});
  const data:any=await response.json().catch(()=>null);
  if(!response.ok||!data||Number(data.code)>=600&&Number(data.code)!==601&&Number(data.code)!==603){
   console.error("[SIFALO CHECKOUT]",response.status,data);
   return NextResponse.json({ok:false,error:String(data?.response||data?.message||"Sifalo could not start checkout. Please try again.")},{status:502});
  }
  let checkoutUrl=String(data.url||data.checkout_url||"");
  if(!checkoutUrl&&data.key&&data.token){
   const host=String(process.env.SIFALO_ENV||"live").toLowerCase()==="staging"?"https://pay.sifalo.net/checkout/":"https://pay.sifalo.com/checkout/";
   checkoutUrl=host+"?key="+encodeURIComponent(String(data.key))+"&token="+encodeURIComponent(String(data.token));
  }
  if(!checkoutUrl||!/^https:\/\/(pay\.sifalo\.com|pay\.sifalo\.net)\//i.test(checkoutUrl))return NextResponse.json({ok:false,error:"Sifalo returned an invalid checkout link."},{status:502});
  await (await collection<any>("payments")).insertOne({_id:mongoId(),userId:String(user.id),provider:"sifalo",providerId:String(data.sid||data.key||orderId),orderId,amountUsd:amount,coins,status:Number(data.code)===601?"paid":"pending",txid:String(data.sid||""),packageId:String(coins),raw:{code:data.code,response:data.response},createdAt:new Date(),paidAt:Number(data.code)===601?new Date():null});
  if(Number(data.code)===601){
   const payments=await collection<any>("payments");
   const claimed=await payments.findOneAndUpdate({orderId,provider:"sifalo",status:"paid",credited:{$ne:true}},{$set:{credited:true,updatedAt:new Date()}},{returnDocument:"before"});
   if(claimed){const users=await collection<any>("users"),u=await users.findOneAndUpdate({_id:String(user.id)},{$inc:{coins}},{returnDocument:"after"});if(u)await (await collection("coinTransactions")).insertOne({_id:mongoId(),userId:String(user.id),type:"credit",amount:coins,balanceAfter:Number(u.coins),reference:orderId,description:"Sifalo local payment top-up",createdAt:new Date()});}
  }
  return NextResponse.json({ok:true,url:checkoutUrl,orderId,coins,amount,status:Number(data.code)===603?"pending":"created"});
 }catch(e){
  const message=e instanceof Error?e.message:"";
  if(message==="AUTH_REQUIRED")return NextResponse.json({ok:false,error:"Please sign in to continue."},{status:401});
  console.error("[SIFALO CREATE]",message);
  return NextResponse.json({ok:false,error:"Unable to start local payment. Please try again."},{status:500});
 }
}
