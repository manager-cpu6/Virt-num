import {NextResponse} from "next/server";
import {requireAdmin} from "@/lib/auth";
import {getPaymentSettings,savePaypalCredentials,setActivePaymentProvider,paypalBaseUrl} from "@/lib/payment-settings";
import {paypalApi} from "@/lib/paypal";

export const runtime="nodejs";export const dynamic="force-dynamic";

async function ensurePaypalWebhook(clientId:string,secretKey:string,currentId:string){
  const base=String(process.env.NEXT_PUBLIC_APP_URL||"https://numelixa.com").replace(/\/$/,"");
  // Authenticate explicitly with supplied credentials, then reuse a webhook already registered for this callback URL.
  const basic=Buffer.from(clientId.trim()+":"+secretKey.trim()).toString("base64");
  const tokenRes=await fetch(paypalBaseUrl()+"/v1/oauth2/token",{method:"POST",headers:{Authorization:"Basic "+basic,"Content-Type":"application/x-www-form-urlencoded"},body:"grant_type=client_credentials",cache:"no-store"});
  const tokenData:any=await tokenRes.json().catch(()=>null);
  if(!tokenRes.ok||!tokenData?.access_token)throw new Error("PAYPAL_CREDENTIALS_INVALID");
  const existingRes=await fetch(paypalBaseUrl()+"/v1/notifications/webhooks?page_size=100",{headers:{Authorization:"Bearer "+tokenData.access_token,Accept:"application/json"},cache:"no-store"});\n  const existing:any=await existingRes.json().catch(()=>null);\n  const existingHook=Array.isArray(existing?.webhooks)?existing.webhooks.find((x:any)=>String(x.url||"")===base+"/api/payments/paypal/webhook"):null;\n  if(existingHook?.id)return String(existingHook.id);\n  const events=["PAYMENT.CAPTURE.COMPLETED","PAYMENT.CAPTURE.DENIED","PAYMENT.CAPTURE.REFUNDED"];
  const r=await fetch(paypalBaseUrl()+"/v1/notifications/webhooks",{method:"POST",headers:{Authorization:"Bearer "+tokenData.access_token,"Content-Type":"application/json","Accept":"application/json"},body:JSON.stringify({url:base+"/api/payments/paypal/webhook",event_types:events.map(name=>({name}))}),cache:"no-store"});
  const d:any=await r.json().catch(()=>null);
  if(!r.ok||!d?.id){console.error("[PAYPAL WEBHOOK CREATE]",r.status,d);throw new Error("PAYPAL_WEBHOOK_CREATE_FAILED");}
  return String(d.id);
}

export async function GET(){
 try{await requireAdmin();const s=await getPaymentSettings();return NextResponse.json({ok:true,activeProvider:s.activeProvider,paypal:{configured:s.paypal.configured,clientId:s.paypal.clientId? s.paypal.clientId.slice(0,8)+"…":""},nowpayments:s.nowpayments});}
 catch(e){return NextResponse.json({ok:false,error:"Unauthorized"},{status:401});}
}
export async function POST(req:Request){
 try{
  await requireAdmin();const b:any=await req.json();const action=String(b.action||"");
  if(action==="activate"){
    const provider=b.provider==="paypal"?"paypal":"nowpayments";const s=await getPaymentSettings();
    if(provider==="paypal"&&!s.paypal.configured)return NextResponse.json({ok:false,error:"Configure PayPal Client ID and Secret Key first."},{status:400});
    if(provider==="nowpayments"&&!s.nowpayments.configured)return NextResponse.json({ok:false,error:"NOWPayments is not configured on the server."},{status:400});
    await setActivePaymentProvider(provider);return NextResponse.json({ok:true,activeProvider:provider});
  }
  if(action==="save_paypal"){
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
  const m=e instanceof Error?e.message:"";
  const map:any={PAYPAL_CREDENTIALS_INVALID:"PayPal Client ID or Secret Key is invalid.",PAYPAL_WEBHOOK_CREATE_FAILED:"PayPal credentials are valid but the webhook could not be created."};
  return NextResponse.json({ok:false,error:map[m]||"Unable to update payment settings."},{status:500});
 }
}
