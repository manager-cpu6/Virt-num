import {NextResponse} from "next/server";
import crypto from "crypto";
import {requireUser} from "@/lib/auth";
import {collection,mongoId} from "@/lib/mongo";
import {getSettings} from "@/lib/settings";
export const runtime="nodejs";export const dynamic="force-dynamic";export const maxDuration=60;
const round2=(n:number)=>Math.round((n+Number.EPSILON)*100)/100;
export async function POST(req:Request){try{
 const user=await requireUser();if(!user.verified_at)return NextResponse.json({ok:false,error:"Verify your account before making a card payment."},{status:403});
 const flags=await (await collection<any>("settings")).findOne({_id:"payments"});
 if(flags?.cardPaymentOpen!==true||flags?.cardSurchargeApproved!==true)return NextResponse.json({ok:false,error:"Visa / Mastercard payments are currently unavailable."},{status:403});
 const apiUser=String(process.env.SIFALO_API_USER||"").trim(),apiKey=String(process.env.SIFALO_API_KEY||"").trim();
 if(!apiUser||!apiKey)return NextResponse.json({ok:false,error:"Card checkout is not configured yet."},{status:503});
 const body=await req.json(),base=Number(body.amountUsd),wallet=await getSettings();
 if(!Number.isFinite(base)||round2(base)!==base||base<wallet.minTopupUsd||base>wallet.maxTopupUsd||base>10000)return NextResponse.json({ok:false,error:"Enter a valid wallet amount within the allowed limits."},{status:400});
 const surchargePercent=Number(flags.cardSurchargePercent??40);if(!Number.isFinite(surchargePercent)||surchargePercent<0||surchargePercent>1000000)return NextResponse.json({ok:false,error:"Card surcharge settings are invalid."},{status:503});
 const surcharge=round2(base*surchargePercent/100),vat=round2(surcharge*.375),processing=round2(surcharge*.5),other=round2(surcharge-vat-processing),total=round2(base+surcharge),coins=Math.round(base*wallet.coinsPerUsd);
 if(coins<1)return NextResponse.json({ok:false,error:"The wallet amount is too small."},{status:400});
 const orderId="sifalo_card_"+crypto.randomUUID(),now=new Date(),payments=await collection<any>("payments");
 await payments.insertOne({_id:mongoId(),userId:String(user.id),provider:"sifalo",providerId:orderId,orderId,amountUsd:base,providerAmountUsd:total,cardSurchargeUsd:round2(total-base),cardSurchargePercent:surchargePercent,cardFeeBreakdown:{vat,processing,other,vatPercent:round2(surchargePercent*.375),processingPercent:round2(surchargePercent*.5),otherPercent:round2(surchargePercent-surchargePercent*.875)},coins,method:"card",account:"card_checkout",status:"pending",txid:null,packageId:"custom-usd-card",raw:null,createdAt:now,paidAt:null});
 const apiBase=String(process.env.SIFALO_ENV||"live").toLowerCase()==="staging"?"https://spay-api.sifalo.net/gateway/":"https://api.sifalopay.com/gateway/";
 const checkoutBase=String(process.env.SIFALO_ENV||"live").toLowerCase()==="staging"?"https://pay.sifalo.net/checkout/":"https://pay.sifalo.com/checkout/";
 const auth=Buffer.from(apiUser+":"+apiKey).toString("base64");
 let response:Response;try{response=await fetch(apiBase,{method:"POST",headers:{Authorization:"Basic "+auth,"Content-Type":"application/json"},body:JSON.stringify({amount:total.toFixed(2),gateway:"card",currency:"USD",return_url:"https://secure.payment.numelixa.com/api/payments/card/return?order_id="+encodeURIComponent(orderId),webhook_url:"https://numelixa.com/hooks/sifalopay"}),cache:"no-store",signal:AbortSignal.timeout(55000)});}catch(error){await payments.updateOne({orderId,provider:"sifalo"},{$set:{status:"failed",updatedAt:new Date(),raw:{error:"gateway_timeout"}}});throw error;}
 const data:any=await response.json().catch(()=>null);
 if(!response.ok||!data?.key||!data?.token){await payments.updateOne({orderId,provider:"sifalo"},{$set:{status:"failed",updatedAt:new Date(),raw:data||{error:"checkout_session_failed"}}});console.error("[SIFALO CARD GATEWAY]",response.status,data);return NextResponse.json({ok:false,error:String(data?.response||data?.message||"Sifalo could not create the secure checkout session.")},{status:502});}
 const checkoutUrl=checkoutBase+"?key="+encodeURIComponent(String(data.key))+"&token="+encodeURIComponent(String(data.token));
 await payments.updateOne({orderId,provider:"sifalo"},{$set:{checkoutUrlCreated:true,updatedAt:new Date()}});
 return NextResponse.json({ok:true,orderId,checkoutUrl,amountUsd:base,totalUsd:total,surchargeUsd:round2(total-base)},{headers:{"Cache-Control":"no-store"}});
}catch(e){const m=e instanceof Error?e.message:"";if(m==="AUTH_REQUIRED")return NextResponse.json({ok:false,error:"Sign in to continue."},{status:401});console.error("[CARD CHECKOUT SESSION]",m);return NextResponse.json({ok:false,error:"Unable to start secure card checkout. Please try again."},{status:500});}}
