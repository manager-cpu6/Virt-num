import {NextResponse} from "next/server";
import crypto from "crypto";
import {requireUser} from "@/lib/auth";
import {collection,mongoId} from "@/lib/mongo";
import {getSettings} from "@/lib/settings";
export const runtime="nodejs";export const dynamic="force-dynamic";
function normalizePhone(v:string){return v.replace(/[^0-9]/g,"").replace(/^251/,"0");}
export async function POST(req:Request){
 try{
  const user=await requireUser();
  if(!user.verified_at)return NextResponse.json({ok:false,error:"Verify your email before topping up your wallet."},{status:403});
  const config=await (await collection<any>("settings")).findOne({_id:"payments"});
  if(config?.ebirrOpen!==true)return NextResponse.json({ok:false,error:"eBirr payments are currently closed."},{status:403});
  const receiver=String(config.ebirrReceiver||"").trim(),rate=Number(config.ebirrRateEtbPerUsd||0);
  if(!receiver||!(rate>0))return NextResponse.json({ok:false,error:"eBirr receiving details are not configured."},{status:503});
  const body=await req.json(),amount=Number(body.amountUsd),phone=normalizePhone(String(body.payerPhone||""));
  const settings=await getSettings();
  if(!Number.isFinite(amount)||Math.round(amount*100)!==amount*100||amount<settings.minTopupUsd||amount>Math.min(settings.maxTopupUsd,10000))return NextResponse.json({ok:false,error:"Enter a valid USD amount within the wallet limits."},{status:400});
  if(!/^0[79][0-9]{8}$/.test(phone))return NextResponse.json({ok:false,error:"Enter a valid Ethiopian mobile number."},{status:400});
  const amountEtb=Number((amount*rate).toFixed(2)),coins=Math.round(amount*settings.coinsPerUsd);
  const orderId="ebirr_"+crypto.randomUUID(),now=new Date();
  const payment={_id:mongoId(),userId:String(user.id),provider:"ebirr_manual",providerId:orderId,orderId,amountUsd:amount,amountEtb,exchangeRate:rate,coins,payerPhone:phone,receiverPhone:receiver,method:"ebirr",status:"awaiting_proof",transactionReference:null,smsMatched:false,credited:false,createdAt:now,updatedAt:now};
  await (await collection<any>("payments")).insertOne(payment);
  return NextResponse.json({ok:true,orderId,amountUsd:amount,amountEtb,exchangeRate:rate,receiverPhone:receiver,payerPhone:phone,instructions:String(config.ebirrInstructions||"Pay the exact ETB amount and submit your transaction reference."),status:payment.status});
 }catch(e){
  if(e instanceof Error&&e.message==="AUTH_REQUIRED")return NextResponse.json({ok:false,error:"Sign in to continue."},{status:401});
  console.error("[EBIRR CREATE]",e);return NextResponse.json({ok:false,error:"Unable to create eBirr payment order."},{status:500});
 }
}
