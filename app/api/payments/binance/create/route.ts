import {NextResponse} from "next/server";
import crypto from "crypto";
import {requireUser} from "@/lib/auth";
import {collection,mongoId} from "@/lib/mongo";
import {getSettings} from "@/lib/settings";
import {getPaymentSettings} from "@/lib/payment-settings";

export const runtime="nodejs";
export const dynamic="force-dynamic";
const FALLBACK_PACKS={36:0.77,75:1.65,250:5.49,499:10.99} as Record<number,number>;

function signedHeaders(payload:string){
  const timestamp=String(Date.now()),nonce=crypto.randomBytes(16).toString("hex");
  const key=String(process.env.BINANCE_PAY_PRIVATE_KEY||"").replace(/\\n/g,"\n");
  const signature=crypto.sign("RSA-SHA256",Buffer.from(timestamp+"\n"+nonce+"\n"+payload+"\n"),key).toString("base64");
  return {timestamp,nonce,signature};
}
export async function POST(req:Request){
 try{
  const user=await requireUser();
  if(!user.verified_at)return NextResponse.json({ok:false,error:"Verify your email before buying coins."},{status:403});
  const ps=await getPaymentSettings();
  if(ps.activeProvider!=="binance"||!ps.binance.configured)return NextResponse.json({ok:false,error:"Binance Pay is currently unavailable."},{status:503});
  const body=await req.json(),coins=Math.floor(Number(body.coins)),settings=await getSettings();
  const pack=settings.coinPackages.find((x:any)=>Number(x.coins)===coins);
  const amount=Number(pack?.priceUsd??FALLBACK_PACKS[coins]);
  if(!Number.isFinite(amount)||amount<=0)return NextResponse.json({ok:false,error:"This coin package is no longer available."},{status:400});
  const orderId="binance_"+crypto.randomUUID();
  const base=String(process.env.NEXT_PUBLIC_APP_URL||"https://numelixa.com").replace(/\\/$/,"");
  const payload:any={env:{terminalType:"WEB"},merchantTradeNo:orderId,orderAmount:amount.toFixed(2),currency:"USDT",goods:{goodsType:"02",goodsCategory:"Z000",referenceGoodsId:"numelixa-coins-"+coins,goodsName:"Numelixa wallet top-up",goodsDetail:coins+" coins"},returnUrl:base+"/wallet?payment=success",cancelUrl:base+"/wallet?payment=cancelled",webhookUrl:base+"/api/payments/binance/webhook"};
  const raw=JSON.stringify(payload),h=signedHeaders(raw);
  const response=await fetch("https://bpay.binanceapi.com/binancepay/openapi/v3/order",{method:"POST",headers:{"Content-Type":"application/json","BinancePay-Timestamp":h.timestamp,"BinancePay-Nonce":h.nonce,"BinancePay-Certificate-SN":String(process.env.BINANCE_PAY_CERT_SERIAL||""),"BinancePay-Signature":h.signature},body:raw,cache:"no-store"});
  const result:any=await response.json().catch(()=>null);
  if(!response.ok||result?.status!=="SUCCESS"||!result?.data?.checkoutUrl){console.error("[BINANCE PAY CREATE]",response.status,result?.code,result?.errorMessage);return NextResponse.json({ok:false,error:"Binance Pay could not create checkout. Check merchant credentials and USDT availability."},{status:502});}
  await (await collection("payments")).insertOne({_id:mongoId(),userId:String(user.id),provider:"binance",providerId:String(result.data.prepayId||orderId),orderId,amountUsd:amount,amountCrypto:amount,cryptoCurrency:"USDT",coins,status:"pending",txid:null,packageId:String(coins),raw:result.data,createdAt:new Date(),paidAt:null});
  return NextResponse.json({ok:true,url:String(result.data.checkoutUrl),coins,amount, currency:"USDT",orderId});
 }catch(e){
  const m=e instanceof Error?e.message:"";
  if(m==="AUTH_REQUIRED")return NextResponse.json({ok:false,error:"Please sign in to continue."},{status:401});
  console.error("[BINANCE PAY CREATE]",m);return NextResponse.json({ok:false,error:"Unable to start Binance Pay. Please try again."},{status:500});
 }
}
