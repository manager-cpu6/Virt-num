import {NextResponse} from "next/server";
import {requireUser} from "@/lib/auth";
import {collection,mongoId} from "@/lib/mongo";
import {getSettings} from "@/lib/settings";
import {getPaymentSettings} from "@/lib/payment-settings";
import {getCoinDepositInstructions,getCryptoUsdPrice,personalApiConfigured} from "@/lib/binance-personal";

export const runtime="nodejs";
export const dynamic="force-dynamic";
const FALLBACK_PACKS={36:0.77,75:1.65,250:5.49,499:10.99} as Record<number,number>;
function paymentResponse(p:any){return {ok:true,depositRequired:true,provider:"binance_personal",orderId:p.orderId,coins:Number(p.coins),amount:Number(p.amountCrypto),currency:String(p.cryptoCurrency||"USDT"),address:p.depositAddress,network:p.depositNetwork,networkName:p.depositNetworkName,memo:p.depositMemo||"",baseAmount:Number(p.amountUsd),priceUsd:Number(p.amountUsd),expiresAt:new Date(p.expiresAt).toISOString(),createdAt:p.createdAt?new Date(p.createdAt).toISOString():null};}

export async function POST(req:Request){
 try{
  const user=await requireUser();
  if(!user.verified_at)return NextResponse.json({ok:false,error:"Verify your email before buying coins."},{status:403});
  const ps=await getPaymentSettings();
  if(ps.activeProvider!=="binance"||!await personalApiConfigured())return NextResponse.json({ok:false,error:"Crypto payments are temporarily unavailable."},{status:503});
  const body=await req.json(),coins=Math.floor(Number(body.coins)),settings=await getSettings();
  const pack=settings.coinPackages.find((x:any)=>Number(x.coins)===coins);
  const baseAmount=Number(pack?.priceUsd??FALLBACK_PACKS[coins]);
  if(!Number.isFinite(baseAmount)||baseAmount<=0)return NextResponse.json({ok:false,error:"This coin package is no longer available."},{status:400});
  const currency=String(body.currency||"USDT").toUpperCase();
  if(!/^[A-Z0-9]{2,15}$/.test(currency))return NextResponse.json({ok:false,error:"Choose a supported cryptocurrency."},{status:400});
  const payments=await collection<any>("payments"),now=new Date();
  // Do not expire an unpaid order merely because its visible checkout timer ended.
  // Its amount slot expires independently; deposit reconciliation continues for up to 24 hours.
  if(body.resumeOnly===true)return NextResponse.json({ok:true,found:false});
  const requestedNetwork=String(body.network||"").trim();
  if(!requestedNetwork)return NextResponse.json({ok:false,error:"Choose a deposit network first."},{status:400});
  const instructions=await getCoinDepositInstructions(currency,requestedNetwork);
  const usdPerCoin=await getCryptoUsdPrice(currency);
  const stablecoin=["USDT","USDC","FDUSD","TUSD","USDP","DAI"].includes(currency);
  const decimals=stablecoin?6:(baseAmount/usdPerCoin)<0.000001?12:8;
  const unit=stablecoin?0.000001:1e-8;
  const baseCrypto=Number((baseAmount/usdPerCoin).toFixed(stablecoin?2:decimals));
  if(!Number.isFinite(baseCrypto)||baseCrypto<=0)return NextResponse.json({ok:false,error:"Unable to calculate the payment amount."},{status:502});

  // Web and Android share this collection and reservation pool. Keep existing pending
  // checkouts active so each order (even for the same account on two devices) keeps its
  // own exact amount until it is paid, cancelled, or expires.
  const activeAmountQuery={provider:"binance_personal",status:"pending",reservationActive:{$ne:false},cryptoCurrency:currency,depositAddress:instructions.address,depositNetwork:instructions.network,expiresAt:{$gt:now}};
  const baseCollision=await payments.findOne({...activeAmountQuery,amountCrypto:baseCrypto});
  let amountCrypto=baseCollision?0:baseCrypto;
  if(baseCollision){
   // Reuse the lowest available suffix every time a checkout is cancelled, paid, or abandoned.
   // Never use a monotonically increasing counter: that would make amounts drift upward forever.
   for(let sequence=1;sequence<=9999;sequence++){
    const candidate=Number((baseCrypto+sequence*unit).toFixed(decimals));
    const collision=await payments.findOne({...activeAmountQuery,amountCrypto:candidate});
    if(!collision){amountCrypto=candidate;break;}
   }
  }
  if(!amountCrypto)return NextResponse.json({ok:false,error:"Unable to reserve a unique payment amount. Please try again."},{status:503});
  const orderId="binance_personal_"+crypto.randomUUID(),expiresAt=new Date(now.getTime()+settings.paymentExpiryMinutes*60*1000);
  const payment={_id:mongoId(),userId:String(user.id),provider:"binance_personal",providerId:orderId,orderId,amountUsd:baseAmount,amountCrypto,exact_amount:amountCrypto,amountSuffix:Number((amountCrypto-baseCrypto).toFixed(decimals)),cryptoCurrency:currency,cryptoUsdPrice:usdPerCoin,coins,status:"pending",reservationActive:true,txid:null,packageId:String(coins),depositAddress:instructions.address,depositNetwork:instructions.network,depositNetworkName:instructions.networkName,depositMemo:instructions.memo||"",raw:null,createdAt:now,expiresAt,paidAt:null};
  await payments.insertOne(payment);
  return NextResponse.json(paymentResponse(payment));
 }catch(e){
  const m=e instanceof Error?e.message:"";
  if(m==="AUTH_REQUIRED")return NextResponse.json({ok:false,error:"Please sign in to continue."},{status:401});
  const messages:Record<string,string>={
   BINANCE_PERSONAL_API_NOT_CONFIGURED:"Crypto payments are temporarily unavailable. Please try again later.",
   BINANCE_WEBSHARE_NOT_CONFIGURED:"The payment service proxy is not configured. Please contact support.",
   BINANCE_NETWORK_ERROR:"Numelixa could not connect to Binance. Please try again.",
   BINANCE_API_TIMESTAMP_ERROR:"Binance rejected the request timestamp. Please retry shortly.",
   BINANCE_API_RATE_LIMIT:"Binance rate-limited this request. Please wait a moment and try again.",
   BINANCE_API_TEMPORARY_ERROR:"The payment service is temporarily unavailable. Please try again shortly.",
   BINANCE_USDT_NOT_AVAILABLE:"USDT is unavailable on this Binance account.",
   BINANCE_BNB_NOT_AVAILABLE:"BNB is unavailable on this Binance account.",
   BINANCE_USDT_DEPOSIT_DISABLED:"USDT deposits are disabled for available networks in your Binance account.",
   BINANCE_BNB_DEPOSIT_DISABLED:"BNB deposits are disabled for available networks in your Binance account.",
   BINANCE_DEPOSIT_ADDRESS_UNAVAILABLE:"Binance did not return a deposit address. Check API deposit-read permissions.",
   BINANCE_BNB_PRICE_UNAVAILABLE:"Unable to get the current BNB/USD price. Please retry.",
    BINANCE_USDC_PRICE_UNAVAILABLE:"Unable to get the current USD Coin price. Please retry.",
    BINANCE_ASSET_PRICES_UNAVAILABLE:"Live market prices are unavailable. Please try again shortly."
  };
  console.error("[BINANCE DEPOSIT CREATE]",m);
  const apiCode=m.match(/^BINANCE_API_REQUEST_ERROR_(.+)$/)?.[1];
  const error=messages[m]||(apiCode?"The payment request was rejected (code/status "+apiCode+"). Check API permissions and enabled deposit networks.":"Unable to create the payment request. Please try again or contact support.");
  return NextResponse.json({ok:false,error,diagnosticCode:apiCode||null},{status:500});
 }
}
