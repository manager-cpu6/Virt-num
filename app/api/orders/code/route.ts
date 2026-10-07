import {NextResponse} from "next/server";import {collection,mongoId} from "@/lib/mongo";import {requireUser} from "@/lib/auth";import {check,cancel,finalize} from "@/lib/sms-provider";
import {notifyUser} from "@/lib/notifications";
export const runtime="nodejs";export const dynamic="force-dynamic";
async function refund(o:any){const orders=await collection<any>("orders"),users=await collection<any>("users"),txs=await collection<any>("coinTransactions"),changed=await orders.findOneAndUpdate({_id:o._id,userId:o.userId,status:"waiting"},{$set:{status:"refunded",cancelledAt:new Date(),refundCoins:Number(o.priceCoins||0)}},{returnDocument:"after"});if(!changed)return false;const refundCoins=Number(o.priceCoins||0),u=await users.findOneAndUpdate({_id:o.userId},{$inc:{coins:refundCoins}},{returnDocument:"after"});await txs.insertOne({_id:mongoId(),userId:o.userId,type:"refund",amount:refundCoins,balanceAfter:Number(u?.coins||0),reference:o._id,description:"Automatic no-SMS refund",createdAt:new Date()});return true}
export async function POST(req:Request){try{const u=await requireUser(),id=String((await req.json()).orderId||""),orders=await collection<any>("orders"),o=await orders.findOne({_id:id,userId:u.id});if(!o)return NextResponse.json({ok:false,error:"Order not found."},{status:404});
 if(o.code)return NextResponse.json({ok:true,code:o.code,fullSms:o.fullSms,status:"received"});
 if(o.status==="refunded"||o.status==="cancelled")return NextResponse.json({ok:false,error:"This order was refunded.",status:o.status},{status:409});
 const age=Date.now()-new Date(o.createdAt).getTime();
 const provider=o.provider==="tiger"?"tiger":"5sim";
 if(age>=10*60*1000){try{await cancel(String(o.providerOrderId),provider)}catch{}await refund(o);return NextResponse.json({ok:false,error:"10 minutes passed without an SMS. Your coins have been refunded.",status:"refunded"},{status:409})}
 const p=await check(String(o.providerOrderId),provider);
 if(Number(p.status)===3){const code=String(p.sms||"");try{await finalize(String(o.providerOrderId),provider)}catch{}const changed=await orders.findOneAndUpdate(
   {_id:id,userId:u.id,status:"waiting"},
   {$set:{code,fullSms:String((p as any).fullSms||code),status:"received",completedAt:new Date(),codeNotifiedAt:new Date()}},
   {returnDocument:"after"}
 );
 if(changed){
   try{
     await notifyUser(
       String(u.id),
       "🔐 New verification code",
       code ? "Your verification code is " + code : "A new SMS has arrived. Open Numelixa to view it.",
       {orderId:id,type:"sms",code}
     );
   }catch(error){console.error("[SMS PUSH]",error);}
 }
 return NextResponse.json({ok:true,code,fullSms:String((p as any).fullSms||code),status:"received"})}
 if(Number(p.status)===6){try{await refund(o)}catch{}return NextResponse.json({ok:false,error:"This order was cancelled by the provider.",status:"refunded"},{status:409})}
 return NextResponse.json({ok:true,code:"",status:"waiting",timeLeft:Math.max(0,600-Math.floor(age/1000))})
}catch{return NextResponse.json({ok:false,error:"Unable to check the SMS right now. Please retry."},{status:502})}}