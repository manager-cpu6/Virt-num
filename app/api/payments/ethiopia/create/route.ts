import {NextResponse} from "next/server";
import crypto from "crypto";
import {requireUser} from "@/lib/auth";
import {collection,mongoId} from "@/lib/mongo";
import {getSettings} from "@/lib/settings";
export const runtime="nodejs";export const dynamic="force-dynamic";
const methods:any={
 coopay_ebirr:{receiver:"0905881300",name:"Coopay eBirr"},
 kaafi_ebirr:{receiver:"0905881300",name:"Kaafi eBirr"},
 cbe_birr:{receiver:"0905881300",name:"CBE Birr"},
 cbe_bank:{receiver:"1000812965518",name:"CBE Bank"}
};
function normalizePhone(v:string){return v.replace(/[^0-9]/g,"").replace(/^251/,"0");}
export async function POST(req:Request){
 try{
  const user=await requireUser();if(!user.verified_at)return NextResponse.json({ok:false,error:"Verify your email before topping up."},{status:403});
  const config=await (await collection<any>("settings")).findOne({_id:"payments"});
  if(config?.ebirrOpen!==true)return NextResponse.json({ok:false,error:"Ethiopia payments are currently closed."},{status:403});
  const body=await req.json(),method=String(body.method||""),chosen=methods[method],amount=Number(body.amountUsd),phone=normalizePhone(String(body.payerPhone||""));
  if(!chosen)return NextResponse.json({ok:false,error:"Choose a supported Ethiopian payment method."},{status:400});
  const settings=await getSettings(),rate=Number(config.ebirrRateEtbPerUsd||0);
  if(!(rate>0))return NextResponse.json({ok:false,error:"ETB exchange rate is not configured."},{status:503});
  if(!Number.isFinite(amount)||Math.round(amount*100)/100!==amount||amount<settings.minTopupUsd||amount>Math.min(settings.maxTopupUsd,10000))return NextResponse.json({ok:false,error:"Enter a valid USD amount within wallet limits."},{status:400});
  if(!/^0[79][0-9]{8}$/.test(phone))return NextResponse.json({ok:false,error:"Enter your Ethiopian mobile number as 09XXXXXXXX."},{status:400});
  const amountEtb=Number((amount*rate).toFixed(2)),coins=Math.round(amount*settings.coinsPerUsd),orderId="etpay_"+crypto.randomUUID(),now=new Date();
  const payment={_id:mongoId(),userId:String(user.id),provider:"ebirr_manual",providerId:orderId,orderId,amountUsd:amount,amountEtb,exchangeRate:rate,coins,payerPhone:phone,receiverPhone:chosen.receiver,method,methodName:chosen.name,status:"awaiting_proof",transactionReference:null,smsMatched:false,credited:false,createdAt:now,updatedAt:now};
  await (await collection<any>("payments")).insertOne(payment);
  return NextResponse.json({ok:true,orderId,amountUsd:amount,amountEtb,exchangeRate:rate,receiverPhone:chosen.receiver,payerPhone:phone,method,methodName:chosen.name,status:payment.status});
 }catch(e){if(e instanceof Error&&e.message==="AUTH_REQUIRED")return NextResponse.json({ok:false,error:"Sign in to continue."},{status:401});console.error("[ETHIOPIA PAYMENT CREATE]",e);return NextResponse.json({ok:false,error:"Unable to create payment order."},{status:500});}
}
