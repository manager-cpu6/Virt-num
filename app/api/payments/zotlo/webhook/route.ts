import {NextResponse} from "next/server";
import {collection,mongoId} from "@/lib/mongo";
import {notifyUser} from "@/lib/notifications";
import {getZotloAppId,normalizeWebhook} from "@/lib/zotlo";

export const runtime="nodejs";
export const dynamic="force-dynamic";

export async function POST(req:Request){
  try{
    const body=await req.json();
    const w=normalizeWebhook(body);
    if(w.appId && w.appId!==getZotloAppId())return NextResponse.json({ok:false,error:"Invalid application"},{status:401});
    const custom=w.customParameters||{};
    const orderId=String(custom.numelixaOrderId||custom.orderId||"");
    if(!orderId)return NextResponse.json({ok:true});
    const payments=await collection<any>("payments");
    const p=await payments.findOne({orderId,provider:"zotlo"});
    if(!p)return NextResponse.json({ok:true});

    const success=["success","successful","paid","completed","complete"].includes(w.status);
    if(!success)return NextResponse.json({ok:true});

    // Only credit the exact package/order that Numelixa created. If Zotlo
    // supplies amount/currency, require them to agree with our pending order.
    if(w.packageId && String(w.packageId)!==String(p.packageId)){
      console.error("[ZOTLO WEBHOOK] package mismatch",w.packageId,p.packageId);
      return NextResponse.json({ok:false,error:"Package mismatch"},{status:400});
    }
    if(w.price>0 && Math.abs(Number(w.price)-Number(p.amountUsd))>0.01){
      console.error("[ZOTLO WEBHOOK] amount mismatch",w.price,p.amountUsd);
      return NextResponse.json({ok:false,error:"Amount mismatch"},{status:400});
    }

    const claimed=await payments.findOneAndUpdate(
      {_id:p._id,status:{$ne:"paid"}},
      {$set:{status:"paid",txid:w.transactionId||null,providerId:w.transactionId||p.providerId,raw:w.raw,paidAt:new Date()}},
      {returnDocument:"before"}
    );
    if(!claimed)return NextResponse.json({ok:true});

    const users=await collection<any>("users");
    const u=await users.findOneAndUpdate({_id:p.userId},{$inc:{coins:Number(p.coins)}},{returnDocument:"after"});
    if(!u)throw new Error("Payment user not found");

    await (await collection("coinTransactions")).insertOne({
      _id:mongoId(),userId:p.userId,type:"credit",amount:Number(p.coins),
      balanceAfter:Number(u.coins),reference:p.orderId,
      description:"Zotlo wallet top-up",createdAt:new Date()
    });

    try{
      await notifyUser(String(p.userId),"💰 Payment confirmed",
        "Your wallet was credited with "+Number(p.coins).toLocaleString()+" coins.",
        {paymentId:String(p._id),type:"payment"});
    }catch(error){console.error("[ZOTLO PUSH]",error);}
    return NextResponse.json({ok:true});
  }catch(e){
    console.error("[ZOTLO WEBHOOK]",e);
    return NextResponse.json({ok:false,error:"Webhook failed"},{status:500});
  }
}
