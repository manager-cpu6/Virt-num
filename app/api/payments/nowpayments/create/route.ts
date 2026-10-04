import {NextResponse} from "next/server";
import crypto from "crypto";
import {requireUser} from "@/lib/auth";
import {collection,mongoId} from "@/lib/mongo";
import {getSettings} from "@/lib/settings";

export const runtime="nodejs";
export const dynamic="force-dynamic";

const FALLBACK_PACKS={36:0.77,75:1.65,250:5.49,499:10.99} as Record<number,number>;

export async function POST(req:Request){
 try{
  const u=await requireUser();
  if(!u.verified_at)return NextResponse.json({ok:false,error:"Verify your email before buying coins."},{status:403});
  const body=await req.json();const coins=Math.floor(Number(body.coins));
  const settings=await getSettings();const configured=settings.coinPackages.find((x:any)=>Number(x.coins)===coins);
  const priceUsd=Number(configured?.priceUsd??FALLBACK_PACKS[coins]);
  if(!Number.isFinite(priceUsd)||priceUsd<=0)return NextResponse.json({ok:false,error:"This coin package is no longer available."},{status:400});
  const apiKey=String(process.env.NOWPAYMENTS_API_KEY||"").trim();
  if(!apiKey)return NextResponse.json({ok:false,error:"Wallet payment is temporarily unavailable. Please contact support."},{status:503});

  const orderId="nowpay_"+crypto.randomUUID(),base=(process.env.NEXT_PUBLIC_APP_URL||"https://www.numelixa.com").replace(/\/$/,"");
  const payload={price_amount:priceUsd,price_currency:"usd",order_id:orderId,order_description:"Numelixa wallet top-up — "+coins+" coins",ipn_callback_url:base+"/api/payments/nowpayments/webhook",success_url:base+"/wallet?payment=success",cancel_url:base+"/wallet?payment=cancelled"};
  const response=await fetch("https://api.nowpayments.io/v1/invoice",{method:"POST",headers:{"x-api-key":apiKey,"Content-Type":"application/json"},body:JSON.stringify(payload),cache:"no-store"});
  const data:any=await response.json().catch(()=>null);
  if(!response.ok||!data?.invoice_url){console.error("[NOWPAYMENTS CREATE]",response.status,data);return NextResponse.json({ok:false,error:String(data?.message||data?.error||"Unable to create a secure payment.")},{status:502});}

  await (await collection("payments")).insertOne({_id:mongoId(),userId:String(u.id),provider:"nowpayments",providerId:String(data.id||data.invoice_id||""),orderId,amountUsd:priceUsd,coins,status:"pending",txid:null,packageId:String(coins),raw:data,createdAt:new Date(),paidAt:null});
  return NextResponse.json({ok:true,url:String(data.invoice_url),coins,amount:priceUsd,orderId});
 }catch(e){
  const m=e instanceof Error?e.message:"";
  if(m==="AUTH_REQUIRED")return NextResponse.json({ok:false,error:"Please sign in to continue."},{status:401});
  console.error("[NOWPAYMENTS CREATE]",m);return NextResponse.json({ok:false,error:"Unable to start the payment right now. Please try again."},{status:500});
 }
}