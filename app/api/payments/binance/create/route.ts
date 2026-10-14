import {NextResponse} from "next/server";
import crypto from "crypto";
import {requireUser} from "@/lib/auth";
import {collection,mongoId} from "@/lib/mongo";
import {getSettings} from "@/lib/settings";
import {getPaymentSettings} from "@/lib/payment-settings";
import {getUsdtDepositInstructions,personalApiConfigured} from "@/lib/binance-personal";

export const runtime="nodejs";
export const dynamic="force-dynamic";
const FALLBACK_PACKS={36:0.77,75:1.65,250:5.49,499:10.99} as Record<number,number>;

export async function POST(req:Request){
 try{
  const user=await requireUser();
  if(!user.verified_at)return NextResponse.json({ok:false,error:"Verify your email before buying coins."},{status:403});
  const ps=await getPaymentSettings();
  if(ps.activeProvider!=="binance"||!personalApiConfigured())return NextResponse.json({ok:false,error:"Binance USDT deposits are currently unavailable."},{status:503});
  const body=await req.json(),coins=Math.floor(Number(body.coins)),settings=await getSettings();
  const pack=settings.coinPackages.find((x:any)=>Number(x.coins)===coins);
  const baseAmount=Number(pack?.priceUsd??FALLBACK_PACKS[coins]);
  if(!Number.isFinite(baseAmount)||baseAmount<=0)return NextResponse.json({ok:false,error:"This coin package is no longer available."},{status:400});

  const instructions=await getUsdtDepositInstructions();
  const payments=await collection<any>("payments");
  let amountCrypto=0,unique=false;
  // Add a small, exact USDT fraction so each pending user request has a distinct amount.
  for(let i=0;i<20;i++){
    const cents=crypto.randomInt(0,100);
    const candidate=Number((baseAmount+cents/100).toFixed(2));
    const existing=await payments.findOne({provider:"binance_personal",status:"pending",amountCrypto:candidate});
    if(!existing){amountCrypto=candidate;unique=true;break;}
  }
  if(!unique)return NextResponse.json({ok:false,error:"Unable to reserve a unique deposit amount. Please try again."},{status:409});
  const orderId="binance_personal_"+crypto.randomUUID();
  const now=new Date();
  await payments.insertOne({
    _id:mongoId(),userId:String(user.id),provider:"binance_personal",providerId:orderId,orderId,
    amountUsd:baseAmount,amountCrypto,cryptoCurrency:"USDT",coins,status:"pending",txid:null,
    packageId:String(coins),depositAddress:instructions.address,depositNetwork:instructions.network,
    depositNetworkName:instructions.networkName,depositMemo:instructions.memo||"",raw:null,
    createdAt:now,expiresAt:new Date(now.getTime()+15*60*1000),paidAt:null
  });
  return NextResponse.json({
    ok:true,depositRequired:true,provider:"binance_personal",orderId,coins,amount:amountCrypto,
    currency:"USDT",address:instructions.address,network:instructions.network,networkName:instructions.networkName,
    memo:instructions.memo||"",expiresAt:new Date(now.getTime()+15*60*1000).toISOString(),
    instructions:"Send the exact USDT amount on the specified network. Do not send another asset or use a different network. Coins are credited only after Binance confirms the deposit."
  });
 }catch(e){
  const m=e instanceof Error?e.message:"";
  if(m==="AUTH_REQUIRED")return NextResponse.json({ok:false,error:"Please sign in to continue."},{status:401});
  const messages:Record<string,string>={
    BINANCE_PERSONAL_API_NOT_CONFIGURED:"Binance Personal API is not configured. Please try again later.",
    BINANCE_PERSONAL_API_KEY_INVALID:"Binance rejected the API credentials. Check that the API key and secret match.",
    BINANCE_NETWORK_ERROR:"Numelixa could not connect to Binance. Check Binance API availability and try again.",
    BINANCE_API_AUTH_ERROR_-2015:"Binance rejected this API key. Check API permissions and the trusted-IP allowlist; Vercel server IPs may not be fixed.",
    BINANCE_API_AUTH_ERROR_-2014:"Binance API key format was rejected. Check that BINANCE_API_KEY is copied correctly.",
    BINANCE_API_TIMESTAMP_ERROR:"Binance rejected the request timestamp. Please retry shortly.",
    BINANCE_API_RATE_LIMIT:"Binance rate-limited this request. Please wait a moment and try again.",
    BINANCE_API_TEMPORARY_ERROR:"Binance is temporarily unavailable. Please try again shortly.",
    BINANCE_API_PERMISSION_ERROR_-2010:"This Binance API key does not have permission for this wallet operation.",
    BINANCE_API_PERMISSION_ERROR_-2008:"Binance does not recognize this API key. Check the key and account.",
    BINANCE_API_REQUEST_ERROR_-1022:"Binance signature verification failed. Check BINANCE_SECRET_KEY for extra spaces or a wrong secret.",
    BINANCE_API_REQUEST_ERROR_-1102:"Binance rejected a required request parameter. Please contact support.",
    BINANCE_API_REQUEST_ERROR_-1002:"Binance requires additional API authorization or permissions.",
    BINANCE_API_REQUEST_FAILED:"Binance API request failed. Check API permissions, trusted-IP settings, and account deposit availability.",
    BINANCE_USDT_NOT_AVAILABLE:"USDT is not available on this Binance account.",
    BINANCE_USDT_DEPOSIT_DISABLED:"USDT deposits are disabled for the available Binance networks. Enable a supported USDT deposit network.",
    BINANCE_DEPOSIT_ADDRESS_UNAVAILABLE:"Binance did not return a deposit address. Check that the API key has read access to wallet/deposit information."
  };
  console.error("[BINANCE PERSONAL DEPOSIT CREATE]",m);
  return NextResponse.json({ok:false,error:messages[m]||"Unable to create the payment request. Check the Binance API permissions and try again."},{status:500});
 }
}
