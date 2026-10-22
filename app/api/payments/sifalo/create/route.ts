import {NextResponse} from "next/server";
import crypto from "crypto";
import {requireUser} from "@/lib/auth";
import {collection,mongoId} from "@/lib/mongo";
import {getSettings} from "@/lib/settings";
import {POST as handleSifaloWebhook} from "../webhook/route";

export const runtime="nodejs";
export const dynamic="force-dynamic";
export const maxDuration=60;

const METHODS:Record<string,string>={waafi:"waafi",edahab:"edahab",premier:"pbwallet"};
export async function POST(req:Request){
 try{
  const user=await requireUser();
  if(!user.verified_at)return NextResponse.json({ok:false,error:"Verify your email before topping up your wallet."},{status:403});
  const flags=await (await collection<any>("settings")).findOne({_id:"payments"});
  if(flags?.sifaloLocalOpen!==true)return NextResponse.json({ok:false,error:"Local payments are currently closed. Choose crypto instead."},{status:403});
  const apiUser=String(process.env.SIFALO_API_USER||"").trim(),apiKey=String(process.env.SIFALO_API_KEY||"").trim();
  if(!apiUser||!apiKey)return NextResponse.json({ok:false,error:"Local payments are not configured yet."},{status:503});
  const body=await req.json();
  const method=String(body.method||"").toLowerCase();
  const gateway=METHODS[method];
  if(!gateway)return NextResponse.json({ok:false,error:"Choose Waafi / EVC / ZAAD / SAHAL, eDahab or Premier Wallet. Direct card processing is not enabled by the current Sifalo API."},{status:400});
  const account=String(body.phone||"").replace(/[\s()-]/g,"").replace(/^\+/,"");
  if(!/^[0-9]{7,18}$/.test(account))return NextResponse.json({ok:false,error:"Enter a valid wallet phone number with country code."},{status:400});
  const settings=await getSettings();
  const amount=Number(body.amountUsd);
  if(!Number.isFinite(amount)||Math.abs(Math.round(amount*100)/100-amount)>0.000001||amount<settings.minTopupUsd||amount>settings.maxTopupUsd||amount>10000)
   return NextResponse.json({ok:false,error:"Enter an amount between $"+settings.minTopupUsd.toFixed(2)+" and $"+Math.min(settings.maxTopupUsd,10000).toFixed(2)+"."},{status:400});
  const coins=Math.round(amount*settings.coinsPerUsd);
  if(coins<1)return NextResponse.json({ok:false,error:"The amount is too small for this wallet."},{status:400});
  const orderId="sifalo_"+crypto.randomUUID();
  const apiBase=String(process.env.SIFALO_ENV||"live").toLowerCase()==="staging"?"https://spay-api.sifalo.net/gateway/":"https://api.sifalopay.com/gateway/";
  const auth=Buffer.from(apiUser+":"+apiKey).toString("base64");
  const payments=await collection<any>("payments"),now=new Date();
  // Persist the unique order before calling the provider so a timeout can be safely reconciled.
  await payments.insertOne({_id:mongoId(),userId:String(user.id),provider:"sifalo",providerId:orderId,orderId,amountUsd:amount,coins,method,account,status:"pending",txid:null,packageId:"custom-usd",raw:null,createdAt:now,paidAt:null});
  let response:Response;
  try{
   response=await fetch(apiBase,{method:"POST",headers:{Authorization:"Basic "+auth,"Content-Type":"application/json"},body:JSON.stringify({account,gateway,amount:amount.toFixed(2),currency:"USD",order_id:orderId,webhook_url:"https://numelixa.com/hooks/sifalopay"}),cache:"no-store",signal:AbortSignal.timeout(55000)});
  }catch(e){
   console.error("[SIFALO DIRECT CHARGE TIMEOUT]",orderId,e instanceof Error?e.message:"timeout");
   return NextResponse.json({ok:true,orderId,amountUsd:amount,status:"pending",message:"The provider is taking longer than expected. We are checking the payment status; do not submit another request."},{status:202,headers:{"Cache-Control":"no-store"}});
  }
  const data:any=await response.json().catch(()=>null);
  if(!response.ok||!data||![601,603,600,604].includes(Number(data.code))){
   await payments.updateOne({orderId,provider:"sifalo",credited:{$ne:true}},{$set:{status:"failed",raw:data||{error:"provider_rejected"},updatedAt:new Date()}});
   console.error("[SIFALO DIRECT CHARGE]",response.status,data);
   return NextResponse.json({ok:false,error:String(data?.response||data?.message||"The wallet provider could not process this request.")},{status:502});
  }
  await payments.updateOne({orderId,provider:"sifalo"},{$set:{providerId:String(data.sid||orderId),txid:String(data.sid||""),status:Number(data.code)===600||Number(data.code)===604?"failed":"pending",raw:{code:data.code,response:data.response,payment_type:data.payment_type},updatedAt:new Date()}});
  if(Number(data.code)===601){
   const callback=await handleSifaloWebhook(new Request(new URL("/hooks/sifalopay",req.url),{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...data,order_id:orderId,amount:data.amount??amount,currency:data.currency??"USD",status:"success",code:601})}));
   if(!callback.ok)return NextResponse.json({ok:false,error:"Payment was submitted. Wallet confirmation is delayed; do not pay again.",orderId,status:"pending"},{status:202});
  }
  return NextResponse.json({ok:true,orderId,amountUsd:amount,status:Number(data.code)===601?"paid":Number(data.code)===603?"pending":"failed",message:String(data.response||"Payment request sent to your wallet. Approve it on your phone.")},{headers:{"Cache-Control":"no-store"}});
 }catch(e){
  const message=e instanceof Error?e.message:"";
  if(message==="AUTH_REQUIRED")return NextResponse.json({ok:false,error:"Sign in to continue."},{status:401});
  console.error("[SIFALO CREATE]",message);
  return NextResponse.json({ok:false,error:"Unable to start the payment. Please try again."},{status:500});
 }
}
