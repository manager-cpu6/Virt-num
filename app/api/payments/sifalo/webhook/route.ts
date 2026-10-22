import {NextResponse} from "next/server";
import {collection,getMongoClient,mongoId} from "@/lib/mongo";
import {notifyUser} from "@/lib/notifications";
export const runtime="nodejs";
export const dynamic="force-dynamic";

export async function POST(req:Request){
 try{
  const body:any=await req.json();
  const orderId=String(body.order_id||"");
  const code=Number(body.code);
  const status=String(body.status||"").toLowerCase();
  if(!orderId)return NextResponse.json({ok:true});
  const payments=await collection<any>("payments");
  const p=await payments.findOne({orderId,provider:"sifalo"});
  if(!p)return NextResponse.json({ok:true});
  if(status!=="success"||code!==601){
   await payments.updateOne({_id:p._id,credited:{$ne:true}},{$set:{status:code===603?"pending":code===600||code===604?"failed":"pending",txid:String(body.sid||p.txid||""),raw:body,updatedAt:new Date()}});
   return NextResponse.json({ok:true});
  }
  if(Math.abs(Number(body.amount)-Number(p.amountUsd))>0.01||String(body.currency||"USD").toUpperCase()!=="USD")return NextResponse.json({ok:false,error:"Payment amount mismatch"},{status:400});
  const client=getMongoClient();
  const session=client.startSession();
  let creditedNow=false;
  try{
   await session.withTransaction(async()=>{
    const claimed=await payments.findOneAndUpdate({_id:p._id,credited:{$ne:true}},{$set:{status:"paid",txid:String(body.sid||p.txid||""),raw:body,paidAt:new Date(),updatedAt:new Date()}},{session,returnDocument:"before"});
    if(!claimed)return;
    const users=await collection<any>("users");
    const u=await users.findOneAndUpdate({_id:String(p.userId)},{$inc:{coins:Number(p.coins)}},{session,returnDocument:"after"});
    if(!u)throw new Error("Payment user not found");
    await (await collection("coinTransactions")).insertOne({_id:mongoId(),userId:String(p.userId),type:"credit",amount:Number(p.coins),balanceAfter:Number(u.coins),reference:p.orderId,description:"Sifalo local payment top-up",createdAt:new Date()},{session});
    await payments.updateOne({_id:p._id,credited:{$ne:true}},{$set:{credited:true,status:"paid",updatedAt:new Date()}},{session});
    creditedNow=true;
   });
  }finally{await session.endSession();}
  if(creditedNow){
   try{await notifyUser(String(p.userId),"💰 Payment confirmed","Your wallet was credited with "+Number(p.coins).toLocaleString()+" coins.",{paymentId:String(p._id),type:"payment"});}catch(e){console.error("[SIFALO PUSH]",e);}
  }
  return NextResponse.json({ok:true});
 }catch(e){console.error("[SIFALO WEBHOOK]",e);return NextResponse.json({ok:false,error:"Webhook processing failed."},{status:500});}
}
