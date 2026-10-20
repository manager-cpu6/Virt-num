import {NextResponse} from "next/server";
import {requireAdmin} from "@/lib/auth";
import {getPaymentSettings,savePaypalCredentials,saveBinanceConnectionConfig,setActivePaymentProvider,paypalBaseUrl} from "@/lib/payment-settings";
import {paypalApi} from "@/lib/paypal";
import {getUsdtDepositInstructions,personalApiConfigured} from "@/lib/binance-personal";
import {collection} from "@/lib/mongo";
import {getSettings} from "@/lib/settings";

export const runtime="nodejs";export const dynamic="force-dynamic";

async function ensurePaypalWebhook(clientId:string,secretKey:string,currentId:string){
  const base=String(process.env.NEXT_PUBLIC_APP_URL||"https://numelixa.com").replace(/\/$/,"");
  // Authenticate explicitly with supplied credentials, then reuse a webhook already registered for this callback URL.
  const basic=Buffer.from(clientId.trim()+":"+secretKey.trim()).toString("base64");
  const tokenRes=await fetch(paypalBaseUrl()+"/v1/oauth2/token",{method:"POST",headers:{Authorization:"Basic "+basic,"Content-Type":"application/x-www-form-urlencoded"},body:"grant_type=client_credentials",cache:"no-store"});
  const tokenData:any=await tokenRes.json().catch(()=>null);
  if(!tokenRes.ok||!tokenData?.access_token)throw new Error("PAYPAL_CREDENTIALS_INVALID");
  const existingRes=await fetch(paypalBaseUrl()+"/v1/notifications/webhooks?page_size=100",{headers:{Authorization:"Bearer "+tokenData.access_token,Accept:"application/json"},cache:"no-store"});
  const existing:any=await existingRes.json().catch(()=>null);
  const existingHook=Array.isArray(existing?.webhooks)?existing.webhooks.find((x:any)=>String(x.url||"")===base+"/api/payments/paypal/webhook"):null;
  if(existingHook?.id)return String(existingHook.id);
  const events=["PAYMENT.CAPTURE.COMPLETED","PAYMENT.CAPTURE.DENIED","PAYMENT.CAPTURE.REFUNDED"];
  const r=await fetch(paypalBaseUrl()+"/v1/notifications/webhooks",{method:"POST",headers:{Authorization:"Bearer "+tokenData.access_token,"Content-Type":"application/json","Accept":"application/json"},body:JSON.stringify({url:base+"/api/payments/paypal/webhook",event_types:events.map(name=>({name}))}),cache:"no-store"});
  const d:any=await r.json().catch(()=>null);
  if(!r.ok||!d?.id){console.error("[PAYPAL WEBHOOK CREATE]",r.status,d);throw new Error("PAYPAL_WEBHOOK_CREATE_FAILED");}
  return String(d.id);
}

export async function GET(){
 try{
  await requireAdmin();
  const s=await getPaymentSettings();
  const rows=await (await collection<any>("payments")).find({provider:"binance_personal",status:{$in:["pending","paid","expired","cancelled"]}}).sort({createdAt:-1}).limit(100).toArray();
  const now=Date.now();
  const payments=rows.map((p:any)=>({
   orderId:String(p.orderId||""),userId:String(p.userId||""),coins:Number(p.coins||0),
   baseAmount:Number(p.amountUsd||0),exactAmount:Number(p.exact_amount??p.amountCrypto??0),
   currency:String(p.cryptoCurrency||"USDT"),network:String(p.depositNetworkName||p.depositNetwork||""),
   status:String(p.status||"pending"),createdAt:p.createdAt||null,expiresAt:p.expiresAt||null,
   secondsRemaining:p.status==="pending"&&p.expiresAt?Math.max(0,Math.ceil((new Date(p.expiresAt).getTime()-now)/1000)):0,
   reservationActive:p.status==="pending"&&p.reservationActive!==false&&p.expiresAt&&new Date(p.expiresAt).getTime()>now,
   paidAt:p.paidAt||null,txid:p.status==="paid"?String(p.txid||""):""
  }));
  return NextResponse.json({ok:true,activeProvider:s.activeProvider,paypal:{configured:s.paypal.configured,clientId:s.paypal.clientId?s.paypal.clientId.slice(0,8)+"…":""},nowpayments:s.nowpayments,binance:s.binance,payments});
 }catch(e){return NextResponse.json({ok:false,error:"Unauthorized"},{status:401});}
}
export async function POST(req:Request){
 try{
  await requireAdmin();const b:any=await req.json();const action=String(b.action||"");
  if(action==="clear_all_payment_orders"){
    const payments=await collection<any>("payments");
    const result=await payments.deleteMany({provider:"binance_personal",status:{$in:["pending","paid","expired","cancelled"]}});
    return NextResponse.json({ok:true,deletedCount:result.deletedCount||0,message:"All payment orders cleared, including pending, cancelled, expired and paid records."});
  }
  if(action==="payment_order_action"){
    const orderId=String(b.orderId||"").trim(),operation=String(b.operation||"");
    if(!orderId||!["cancel","activate"].includes(operation))return NextResponse.json({ok:false,error:"Choose a valid payment order action."},{status:400});
    const payments=await collection<any>("payments"),order=await payments.findOne({orderId,provider:"binance_personal"});
    if(!order)return NextResponse.json({ok:false,error:"Payment order not found."},{status:404});
    if(order.status==="paid")return NextResponse.json({ok:false,error:"A confirmed payment cannot be cancelled or reactivated."},{status:409});
    const now=new Date();
    if(operation==="cancel"){
      await payments.updateOne({_id:order._id,status:{$ne:"paid"}},{$set:{status:"cancelled",reservationActive:false,cancelledAt:now,updatedAt:now,cancelReason:"admin_cancelled"}});
      return NextResponse.json({ok:true,message:"Payment order cancelled and amount reservation released."});
    }
    const settings=await getSettings(),minutes=settings.paymentExpiryMinutes||15;
    const collision=await payments.findOne({provider:"binance_personal",_id:{$ne:order._id},status:"pending",reservationActive:{$ne:false},cryptoCurrency:order.cryptoCurrency,depositAddress:order.depositAddress,depositNetwork:order.depositNetwork,amountCrypto:Number(order.amountCrypto),expiresAt:{$gt:now}});
    if(collision)return NextResponse.json({ok:false,error:"That exact amount is already reserved by another active checkout."},{status:409});
    await payments.updateOne({_id:order._id,status:{$ne:"paid"}},{$set:{status:"pending",reservationActive:true,expiresAt:new Date(now.getTime()+minutes*60*1000),updatedAt:now},$unset:{cancelledAt:"",cancelReason:""}});
    return NextResponse.json({ok:true,message:"Payment order activated and its reservation restored."});
  }
  if(action==="test_binance"){
    if(!await personalApiConfigured())return NextResponse.json({ok:false,error:"Add BINANCE_API_KEY and BINANCE_SECRET_KEY in Vercel Production, then redeploy."},{status:400});
    const info=await getUsdtDepositInstructions();
    const address=String(info.address||"");
    return NextResponse.json({ok:true,network:info.networkName||info.network,addressPreview:address.length>12?address.slice(0,6)+"…"+address.slice(-5):address,message:"Binance API connection successful. Deposit address is available."});
  }
  if(action==="activate"){
    const provider=b.provider==="paypal"?"paypal":b.provider==="binance"?"binance":"nowpayments";const s=await getPaymentSettings();
    if(provider==="paypal"&&!s.paypal.configured)return NextResponse.json({ok:false,error:"Configure PayPal Client ID and Secret Key first."},{status:400});
    if(provider==="nowpayments"&&!s.nowpayments.configured)return NextResponse.json({ok:false,error:"NOWPayments is not configured on the server."},{status:400});
    if(provider==="binance"&&!s.binance.configured)return NextResponse.json({ok:false,error:"Save valid Binance API credentials and Webshare proxy details first."},{status:400});
    await setActivePaymentProvider(provider);return NextResponse.json({ok:true,activeProvider:provider});
  }
  if(action==="save_binance_connection"){\n    const saved=await saveBinanceConnectionConfig({webshareHost:b.webshareHost,websharePort:b.websharePort,webshareUsername:b.webshareUsername,websharePassword:b.websharePassword,apiKey:b.apiKey,apiSecret:b.apiSecret});\n    return NextResponse.json({ok:true,binance:saved.binance,message:"Webshare proxy and Binance API settings saved securely."});\n  }\n  if(action==="save_paypal"){
    const clientId=String(b.clientId||"").trim(),secretKey=String(b.secretKey||"").trim();
    if(clientId.length<10||secretKey.length<10)return NextResponse.json({ok:false,error:"Enter a valid PayPal Client ID and Secret Key."},{status:400});
    const current=await getPaymentSettings();
    const webhookId=await ensurePaypalWebhook(clientId,secretKey,current.paypal.webhookId);
    await savePaypalCredentials(clientId,secretKey,webhookId);
    return NextResponse.json({ok:true,configured:true,webhookId});
  }
  return NextResponse.json({ok:false,error:"Invalid payment action."},{status:400});
 }catch(e){
  console.error("[ADMIN PAYMENTS]",e);
  const message=e instanceof Error?e.message:"";
  const binanceErrors:Record<string,string>={
    BINANCE_PERSONAL_API_NOT_CONFIGURED:"Add BINANCE_API_KEY and BINANCE_SECRET_KEY in Vercel Production, then redeploy.",
    BINANCE_FIXIE_URL_NOT_CONFIGURED:"Add FIXIE_URL to Vercel Production Environment Variables, then redeploy.",
    BINANCE_NETWORK_ERROR:"Could not connect to Binance. Check network access and try again.",
    "BINANCE_API_AUTH_ERROR_-2015":"Binance rejected the API key. Check read permissions and trusted-IP restrictions; Vercel server IPs may not be fixed.",
    "BINANCE_API_AUTH_ERROR_-2014":"Binance API key format was rejected. Check the API key.",
    BINANCE_API_TIMESTAMP_ERROR:"Binance rejected the request timestamp. Retry the test.",
    BINANCE_API_RATE_LIMIT:"Binance rate-limited the test. Wait briefly and retry.",
    BINANCE_API_TEMPORARY_ERROR:"Binance is temporarily unavailable.",
    "BINANCE_API_REQUEST_ERROR_-1022":"Binance signature verification failed. Recheck BINANCE_SECRET_KEY.",
    BINANCE_USDT_DEPOSIT_DISABLED:"USDT deposits are disabled for available networks in your Binance account.",
    BINANCE_DEPOSIT_ADDRESS_UNAVAILABLE:"Binance returned no address. Check wallet/deposit read permissions."
  };
  if(message==="BINANCE_CREDENTIALS_REQUIRED")return NextResponse.json({ok:false,error:"Enter both Binance API key and API secret."},{status:400});\n  if(message==="WEBSHARE_CONFIGURATION_INVALID")return NextResponse.json({ok:false,error:"Enter a valid Webshare host, port, username and password."},{status:400});\n  if(binanceErrors[message])return NextResponse.json({ok:false,error:binanceErrors[message]},{status:502});
  const apiCode=message.match(/^BINANCE_API_REQUEST_ERROR_(.+)$/)?.[1];
  if(apiCode)return NextResponse.json({ok:false,error:"Binance rejected the signed request (API code/status "+apiCode+"). Check the Binance API permissions, account eligibility, and enabled deposit network.",diagnosticCode:apiCode},{status:502});
  const m=e instanceof Error?e.message:"";
  const map:any={PAYPAL_CREDENTIALS_INVALID:"PayPal Client ID or Secret Key is invalid.",PAYPAL_WEBHOOK_CREATE_FAILED:"PayPal credentials are valid but the webhook could not be created."};
  return NextResponse.json({ok:false,error:map[m]||"Unable to update payment settings."},{status:500});
 }
}
