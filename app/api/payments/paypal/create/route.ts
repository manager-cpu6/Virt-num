import {NextResponse} from "next/server";
import crypto from "crypto";
import {requireUser} from "@/lib/auth";
import {collection,mongoId} from "@/lib/mongo";
import {getSettings} from "@/lib/settings";
import {getPaymentSettings} from "@/lib/payment-settings";
import {paypalApi} from "@/lib/paypal";

export const runtime="nodejs";export const dynamic="force-dynamic";
const FALLBACK_PACKS={36:0.77,75:1.65,250:5.49,499:10.99} as Record<number,number>;

export async function POST(req:Request){
 try{
  const u=await requireUser();if(!u.verified_at)return NextResponse.json({ok:false,error:"Verify your email before buying coins."},{status:403});
  const body=await req.json(),coins=Math.floor(Number(body.coins));const settings=await getSettings();
  const pack=settings.coinPackages.find((x:any)=>Number(x.coins)===coins),priceUsd=Number(pack?.priceUsd??FALLBACK_PACKS[coins]);
  if(!Number.isFinite(priceUsd)||priceUsd<=0)return NextResponse.json({ok:false,error:"This coin package is no longer available."},{status:400});
  const ps=await getPaymentSettings();if(ps.activeProvider!=="paypal"||!ps.paypal.configured)return NextResponse.json({ok:false,error:"PayPal payments are currently unavailable."},{status:503});
  const internalOrderId="paypal_"+crypto.randomUUID();
  const order:any=await paypalApi("/v2/checkout/orders",{method:"POST",body:JSON.stringify({intent:"CAPTURE",purchase_units:[{reference_id:internalOrderId,custom_id:internalOrderId,description:"Numelixa wallet top-up — "+coins+" coins",amount:{currency_code:"USD",value:priceUsd.toFixed(2)}}],application_context:{brand_name:"Numelixa",user_action:"PAY_NOW",shipping_preference:"NO_SHIPPING",return_url:(process.env.NEXT_PUBLIC_APP_URL||"https://numelixa.com")+"/wallet?paypal=success",cancel_url:(process.env.NEXT_PUBLIC_APP_URL||"https://numelixa.com")+"/wallet?paypal=cancelled"}})});
  const approve=Array.isArray(order.links)?order.links.find((x:any)=>x.rel==="approve")?.href:null;if(!approve)throw new Error("PAYPAL_APPROVAL_MISSING");
  await (await collection("payments")).insertOne({_id:mongoId(),userId:String(u.id),provider:"paypal",providerId:String(order.id),orderId:internalOrderId,amountUsd:priceUsd,coins,status:"pending",txid:null,packageId:String(coins),raw:order,createdAt:new Date(),paidAt:null});
  return NextResponse.json({ok:true,url:approve,coins,amount:priceUsd,orderId:internalOrderId});
 }catch(e){
  const m=e instanceof Error?e.message:"";if(m==="AUTH_REQUIRED")return NextResponse.json({ok:false,error:"Please sign in to continue."},{status:401});
  console.error("[PAYPAL CREATE]",e);return NextResponse.json({ok:false,error:"Unable to start PayPal payment right now. Please try again."},{status:500});
 }
}
