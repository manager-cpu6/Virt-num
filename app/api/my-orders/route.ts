import {NextResponse} from "next/server";
import {requireUser} from "@/lib/auth";
import {collection,mongoId} from "@/lib/mongo";
import {cancelOrAlreadyClosed} from "@/lib/sms-provider";
import {getSettings} from "@/lib/settings";
export const runtime="nodejs";export const dynamic="force-dynamic";
export async function GET(){
 try{
  const u=await requireUser(),ordersCollection=await collection<any>("orders"),users=await collection<any>("users"),txs=await collection<any>("coinTransactions");
  const rows=await ordersCollection.find({userId:u.id}).sort({createdAt:-1}).limit(100).toArray();
  for(const o of rows){
   if(o.status!=="waiting"||!o.expiresAt||new Date(o.expiresAt).getTime()>Date.now())continue;
   const claimed=await ordersCollection.findOneAndUpdate({_id:o._id,userId:u.id,status:"waiting"},{$set:{status:"cancelling",cancellationRequestedAt:new Date()}},{returnDocument:"after"});
   if(!claimed)continue;
   try{
    await cancelOrAlreadyClosed(String(o.providerOrderId||""),String(o.provider||"")==="tiger"?"tiger":"5sim");
    const refund=Math.max(0,Number(o.priceCoins||0));
    const changed=await ordersCollection.findOneAndUpdate({_id:o._id,userId:u.id,status:"cancelling"},{$set:{status:"cancelled",cancelledAt:new Date(),refundCoins:refund}},{returnDocument:"after"});
    if(changed){
     const updated=await users.findOneAndUpdate({_id:u.id},{$inc:{coins:refund}},{returnDocument:"after"});
     if(refund>0)await txs.insertOne({_id:mongoId(),userId:u.id,type:"refund",amount:refund,balanceAfter:Number(updated?.coins||0),reference:String(o._id),description:"Expired activation refund",createdAt:new Date()});
    }
   }catch(error){
    await ordersCollection.updateOne({_id:o._id,userId:u.id,status:"cancelling"},{$set:{status:"waiting"},$unset:{cancellationRequestedAt:""}});
    console.error("[EXPIRED ORDER REFUND]",{orderId:String(o._id),message:error instanceof Error?error.message:String(error)});
   }
  }
  const refreshed=await ordersCollection.find({userId:u.id}).sort({createdAt:-1}).limit(100).toArray();
  const settings=await getSettings();
  const result=refreshed.map(o=>({id:o._id,service:o.service,country:o.country,country_code:o.countryCode,phone_number:o.phoneNumber,price_usd:Number((Number(o.priceCoins||0)/(Number(settings.coinsPerUsd)||100)).toFixed(2)),status:o.status,code:o.code,expires_at:o.expiresAt,created_at:o.createdAt}));
  return NextResponse.json({ok:true,orders:result});
 }catch(e){return NextResponse.json({ok:false,error:e instanceof Error?e.message:"Not signed in"},{status:401})}
}
