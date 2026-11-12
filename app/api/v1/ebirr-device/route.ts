import {NextResponse} from "next/server";
import crypto from "crypto";
import {collection} from "@/lib/mongo";

export const runtime="nodejs";
export const dynamic="force-dynamic";

function tokenMatches(candidate:string,expected:string){
  if(!candidate||!expected)return false;
  const a=crypto.createHash("sha256").update(candidate).digest();
  const b=Buffer.from(expected,"hex");
  return a.length===b.length&&crypto.timingSafeEqual(a,b);
}
async function authorize(req:Request){
  const candidate=String(req.headers.get("x-numelixa-device-token")||"").trim();
  const settings=await (await collection<any>("settings")).findOne({_id:"payments"});
  if(!tokenMatches(candidate,String(settings?.ebirrDeviceTokenHash||"")))return null;
  return settings;
}
export async function GET(req:Request){
  try{
    const settings=await authorize(req);
    if(!settings)return NextResponse.json({ok:false,error:"Device token is invalid or revoked."},{status:401});
    const [orders,events]=await Promise.all([
      (await collection<any>("payments")).find({provider:"ebirr_manual"}).sort({createdAt:-1}).limit(100).toArray(),
      (await collection<any>("ebirrSmsEvents")).find({}).sort({receivedAt:-1}).limit(50).toArray()
    ]);
    return NextResponse.json({ok:true,settings:{
      open:settings.ebirrOpen===true,rate:Number(settings.ebirrRateEtbPerUsd||0),
      receiver:String(settings.ebirrReceiver||""),instructions:String(settings.ebirrInstructions||""),
      devicePaired:Boolean(settings.ebirrDeviceTokenHash)
    },orders:orders.map(p=>({
      orderId:String(p.orderId),userId:String(p.userId),amountUsd:Number(p.amountUsd||0),
      amountEtb:Number(p.amountEtb||0),rate:Number(p.exchangeRate||0),coins:Number(p.coins||0),
      method:String(p.methodName||p.method||"eBirr"),payerPhone:String(p.payerPhone||""),
      receiverPhone:String(p.receiverPhone||""),status:String(p.status||"pending"),
      transactionReference:String(p.transactionReference||""),smsMatched:p.smsMatched===true,
      smsAmount:p.smsAmount??null,smsPayerPhone:String(p.smsPayerPhone||""),
      createdAt:p.createdAt??null,paidAt:p.paidAt??null
    })),events:events.map(e=>({
      provider:String(e.provider||""),amount:e.amount??null,transactionReference:String(e.transactionReference||""),
      payerPhone:String(e.payerPhone||""),simPhone:String(e.simPhone||""),
      simOperator:String(e.simOperator||""),matched:e.matched===true,reason:String(e.reason||""),
      receivedAt:e.receivedAt??null,rawBody:String(e.rawBody||"")
    }))});
  }catch(e){console.error("[EBIRR DEVICE ADMIN GET]",e);return NextResponse.json({ok:false,error:"Unable to load device dashboard."},{status:500});}
}
export async function POST(req:Request){
  try{
    if(!await authorize(req))return NextResponse.json({ok:false,error:"Device token is invalid or revoked."},{status:401});
    const body:any=await req.json(),action=String(body.action||"");
    const settings=await collection<any>("settings");
    if(action==="save_settings"){
      const open=body.open===true,rate=Number(body.rate);
      const receiver=String(body.receiver||"").trim().replace(/[\s()-]/g,"");
      const instructions=String(body.instructions||"").trim().slice(0,800);
      if(!Number.isFinite(rate)||rate<=0||rate>100000)return NextResponse.json({ok:false,error:"Enter a valid ETB amount for one USD."},{status:400});
      if(!/^\+?251[79][0-9]{8}$/.test(receiver)&&!/^0[79][0-9]{8}$/.test(receiver))return NextResponse.json({ok:false,error:"Enter a valid Ethiopian eBirr receiving number."},{status:400});
      await settings.updateOne({_id:"payments"},{$set:{ebirrOpen:open,ebirrRateEtbPerUsd:rate,ebirrReceiver:receiver,ebirrInstructions:instructions,updatedAt:new Date()}},{upsert:true});
      return NextResponse.json({ok:true});
    }
    if(action==="close_order"){
      const orderId=String(body.orderId||"").trim();
      if(!orderId)return NextResponse.json({ok:false,error:"Order ID is required."},{status:400});
      const result=await (await collection<any>("payments")).updateOne(
        {orderId,provider:"ebirr_manual",credited:{$ne:true},status:{$nin:["paid","rejected","closed"]}},
        {$set:{status:"closed",closedAt:new Date(),updatedAt:new Date(),closedBy:"paired_ebirr_device"}}
      );
      if(!result.modifiedCount)return NextResponse.json({ok:false,error:"Order is missing, already paid, or already closed."},{status:409});
      return NextResponse.json({ok:true,status:"closed"});
    }
    if(action==="revoke_device"){
      await settings.updateOne({_id:"payments"},{$unset:{ebirrDeviceTokenHash:"",ebirrDevicePairedAt:""},$set:{updatedAt:new Date()}},{upsert:true});
      return NextResponse.json({ok:true,status:"revoked"});
    }
    return NextResponse.json({ok:false,error:"Unknown device action."},{status:400});
  }catch(e){console.error("[EBIRR DEVICE ADMIN POST]",e);return NextResponse.json({ok:false,error:"Unable to update device dashboard."},{status:500});}
}
