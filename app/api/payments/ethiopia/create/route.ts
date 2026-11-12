import {NextResponse} from "next/server";
import crypto from "crypto";
import {requireUser} from "@/lib/auth";
import {collection,mongoId} from "@/lib/mongo";
import {getSettings} from "@/lib/settings";
export const runtime="nodejs";export const dynamic="force-dynamic";
const methodNames:Record<string,string>={coopay_ebirr:"Coopay eBirr",kaafi_ebirr:"Kaafi eBirr",cbe_birr:"CBE Birr",cbe_bank:"CBE Bank Transfer",mpesa:"M-Pesa",telebirr:"Telebirr"};
function normalizePhone(v:string){return v.replace(/[^0-9]/g,"").replace(/^251/,"0");}
export async function POST(req:Request){try{
 const user=await requireUser();if(!user.verified_at)return NextResponse.json({ok:false,error:"Verify your email before topping up."},{status:403});
 const config=await (await collection<any>("settings")).findOne({_id:"payments"}),body=await req.json(),method=String(body.method||""),name=methodNames[method],amount=Number(body.amountUsd),phone=normalizePhone(String(body.payerPhone||""));
 if(!name)return NextResponse.json({ok:false,error:"Choose a supported Ethiopian payment method."},{status:400});
 const saved=config?.ethiopiaPaymentMethods?.[method]||{},legacy=config?.ebirrOpen===true&&method==="coopay_ebirr",open=typeof saved.open==="boolean"?saved.open:legacy;
 const receiver=String(saved.receiver??(method==="coopay_ebirr"?String(config?.ebirrReceiver||""):"")).trim();
 if(!open)return NextResponse.json({ok:false,error:"This payment service is currently closed."},{status:403});
 if(!receiver)return NextResponse.json({ok:false,error:"The receiving account is not configured."},{status:503});
 const settings=await getSettings(),rate=Number(config?.ebirrRateEtbPerUsd||0);
 if(!(rate>0))return NextResponse.json({ok:false,error:"ETB exchange rate is not configured."},{status:503});
 if(!Number.isFinite(amount)||Math.round(amount*100)/100!==amount||amount<settings.minTopupUsd||amount>Math.min(settings.maxTopupUsd,10000))return NextResponse.json({ok:false,error:"Enter a valid USD amount within wallet limits."},{status:400});
 if(!/^0[79][0-9]{8}$/.test(phone))return NextResponse.json({ok:false,error:"Enter your Ethiopian mobile number as 09XXXXXXXX."},{status:400});
 const amountEtb=method==="kaafi_ebirr"?Math.round(amount*rate):Number((amount*rate).toFixed(2)),coins=Math.round(amount*settings.coinsPerUsd),orderId="etpay_"+crypto.randomUUID(),receiptId="NX-"+crypto.randomBytes(8).toString("hex").toUpperCase(),now=new Date();
 const payment={_id:mongoId(),userId:String(user.id),provider:"ebirr_manual",providerId:orderId,orderId,receiptId,amountUsd:amount,amountEtb,exchangeRate:rate,coins,payerPhone:phone,receiverPhone:receiver,method,methodName:name,status:"awaiting_proof",transactionReference:null,smsMatched:false,credited:false,createdAt:now,updatedAt:now};
 await (await collection<any>("payments")).insertOne(payment);
 return NextResponse.json({ok:true,orderId,amountUsd:amount,amountEtb,exchangeRate:rate,receiverPhone:receiver,payerPhone:phone,method,methodName:name,instructions:String(saved.instructions||config?.ebirrInstructions||"Pay the exact ETB amount to the receiving account."),status:payment.status});
}catch(e){if(e instanceof Error&&e.message==="AUTH_REQUIRED")return NextResponse.json({ok:false,error:"Sign in to continue."},{status:401});console.error("[ETHIOPIA PAYMENT CREATE]",e);return NextResponse.json({ok:false,error:"Unable to create payment order."},{status:500});}}
