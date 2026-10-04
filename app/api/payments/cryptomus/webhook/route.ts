import {NextResponse} from "next/server";import {verifyWebhook} from "@/lib/cryptomus";import {collection,mongoId} from "@/lib/mongo";\nimport {notifyUser} from "@/lib/notifications";
export const runtime="nodejs";export const dynamic="force-dynamic";
export async function POST(req:Request){try{const data=await req.json();if(!verifyWebhook(data))return NextResponse.json({ok:false,error:"Invalid signature"},{status:401});if(data.status!=="paid"&&data.status!=="paid_over")return NextResponse.json({ok:true});const payments=await collection<any>("payments"),p=await payments.findOne({orderId:String(data.order_id)});if(!p)return NextResponse.json({ok:true});const claimed=await payments.findOneAndUpdate({_id:p._id,status:{$ne:"paid"}},{$set:{status:"paid",txid:data.txid||null,raw:data,paidAt:new Date()}},{returnDocument:"before"});if(!claimed)return NextResponse.json({ok:true});const users=await collection<any>("users"),u=await users.findOneAndUpdate({_id:p.userId},{$inc:{coins:Number(p.coins)}},{returnDocument:"after"});if(!u)throw new Error("Payment user not found");await (await collection("coinTransactions")).insertOne({_id:mongoId(),userId:p.userId,type:"credit",amount:Number(p.coins),balanceAfter:Number(u.coins),reference:p.orderId,description:"Cryptomus wallet top-up",createdAt:new Date()});
    try{
      await notifyUser(
        String(p.userId),
        "💰 Payment confirmed",
        "Your wallet was credited with " + Number(p.coins).toLocaleString() + " coins.",
        {paymentId:String(p._id),type:"payment"}
      );
    }catch(error){console.error("[PAYMENT PUSH]",error);}
    return NextResponse.json({ok:true})}catch(e){return NextResponse.json({ok:false,error:e instanceof Error?e.message:"Webhook failed"},{status:500})}}
