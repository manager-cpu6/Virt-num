import {NextResponse} from "next/server";
import {requireUser} from "@/lib/auth";
import {collection,mongoId,getMongoClient} from "@/lib/mongo";
import {getSettings} from "@/lib/settings";
import {notifyUser} from "@/lib/notifications";
export const runtime="nodejs";export const dynamic="force-dynamic";
const money=(v:any)=>Number.isFinite(Number(v))&&Number(v)>0&&Math.abs(Math.round(Number(v)*100)/100-Number(v))<0.0000001;
export async function GET(){
 try{
  const me=await requireUser();
  if(me.role!=="admin"&&me.merchantEnabled!==true)return NextResponse.json({ok:false,error:"Merchant access is not enabled."},{status:403});
  const rows=await (await collection<any>("merchantTransfers")).find(me.role==="admin"?{}:{merchantId:me.id}).sort({createdAt:-1}).limit(200).toArray();
  return NextResponse.json({ok:true,transfers:rows.map(x=>({id:String(x._id),recipientName:x.recipientName,recipientEmail:x.recipientEmail,recipientPublicId:x.recipientPublicId,merchantId:String(x.merchantId||""),recipientId:String(x.recipientId||""),amountUsd:Number(x.amountUsd||0),status:x.status,heldAmountUsd:Number(x.heldAmountUsd||0),createdAt:x.createdAt,updatedAt:x.updatedAt}))},{headers:{"Cache-Control":"no-store"}});
 }catch{return NextResponse.json({ok:false,error:"Unable to load merchant activity."},{status:401})}
}
export async function POST(req:Request){
 try{
  const me=await requireUser();
  if(me.role!=="admin"&&me.merchantEnabled!==true)return NextResponse.json({ok:false,error:"Merchant access is not enabled."},{status:403});
  const b=await req.json(),target=String(b.recipient||"").trim(),amountUsd=Number(b.amountUsd),note=String(b.note||"").trim().slice(0,160);
  if(!target||target.length>254||!money(amountUsd))return NextResponse.json({ok:false,error:"Enter a valid recipient and USD amount."},{status:400});
  const recipient=await (await collection<any>("users")).findOne({$or:[{_id:target},{email:target.toLowerCase()},{publicId:target}]},{projection:{_id:1,email:1,name:1,publicId:1,role:1}});
  if(!recipient)return NextResponse.json({ok:false,error:"No Numelixa account matches that ID or email."},{status:404});
  const toId=String(recipient._id);if(toId===me.id)return NextResponse.json({ok:false,error:"You cannot send funds to your own account."},{status:400});
  if(recipient.role==="admin")return NextResponse.json({ok:false,error:"Transfers to administrator accounts are disabled."},{status:403});
  const pricing=await getSettings(),rate=Number(pricing.coinsPerUsd)||100,amount=Math.round(amountUsd*rate);
  if(amount<=0)return NextResponse.json({ok:false,error:"Amount is below the supported wallet precision."},{status:400});
  const client=getMongoClient(),session=client.startSession(),now=new Date(),transferId=mongoId();
  try{await session.withTransaction(async()=>{
   const users=await collection<any>("users"),sender=await users.findOne({_id:me.id},{session});
   if(!sender||Number(sender.coins||0)<amount)throw new Error("INSUFFICIENT_BALANCE");
   const debit=await users.updateOne({_id:me.id,coins:{$gte:amount}},{$inc:{coins:-amount},$set:{updatedAt:now}},{session});
   if(!debit.modifiedCount)throw new Error("INSUFFICIENT_BALANCE");
   await users.updateOne({_id:toId},{$inc:{coins:amount},$set:{updatedAt:now}},{session});
   await (await collection<any>("merchantTransfers")).insertOne({_id:transferId,merchantId:me.id,recipientId:toId,recipientName:recipient.name||"",recipientEmail:recipient.email||"",recipientPublicId:recipient.publicId||"",amount,amountUsd,balanceAfter:Number(sender.coins)-amount,note,status:"completed",heldAmount:0,heldAmountUsd:0,createdAt:now,updatedAt:now},{session});
   await (await collection<any>("coinTransactions")).insertMany([
    {_id:mongoId(),userId:me.id,type:"merchant_transfer_out",amount:-amount,balanceAfter:Number(sender.coins)-amount,reference:transferId,description:"Merchant transfer to "+(recipient.email||recipient.publicId||toId),createdAt:now},
    {_id:mongoId(),userId:toId,type:"merchant_transfer_in",amount,balanceAfter:Number((await users.findOne({_id:toId},{session}))?.coins||0),reference:transferId,description:"Funds received from Numelixa Merchant",createdAt:now}
   ],{session});
  });}finally{await session.endSession()}
  try{await notifyUser(toId,"Wallet funds received","$"+amountUsd.toFixed(2)+" USD has been added to your wallet by a Numelixa Merchant.",{type:"merchant_credit",amountUsd:amountUsd.toFixed(2),reference:transferId})}catch(e){console.error("[MERCHANT CREDIT NOTIFICATION]",e)}
  return NextResponse.json({ok:true,transferId,status:"completed"});
 }catch(e){const msg=e instanceof Error?e.message:"";return NextResponse.json({ok:false,error:msg==="INSUFFICIENT_BALANCE"?"Your available wallet balance is insufficient.":"Unable to complete this transfer."},{status:msg==="INSUFFICIENT_BALANCE"?400:401})}
}
export async function PATCH(req:Request){
 try{
  const me=await requireUser(),b=await req.json(),transferId=String(b.transferId||""),action=String(b.action||"");
  if(!transferId||!["hold","release"].includes(action))return NextResponse.json({ok:false,error:"Invalid transfer action."},{status:400});
  const transfers=await collection<any>("merchantTransfers"),t=await transfers.findOne({_id:transferId});
  if(!t)return NextResponse.json({ok:false,error:"Transfer not found."},{status:404});
  const isAdmin=me.role==="admin",isOwner=String(t.merchantId)===me.id;
  if(!isAdmin&&!isOwner)return NextResponse.json({ok:false,error:"You can only control transfers you funded."},{status:403});
  const pricing=await getSettings(),rate=Number(pricing.coinsPerUsd)||100,client=getMongoClient(),session=client.startSession(),now=new Date();
  try{await session.withTransaction(async()=>{
   const fresh=await transfers.findOne({_id:transferId},{session});if(!fresh)throw new Error("NOT_FOUND");
   if(action==="hold"){
    const available=Number(fresh.amount||0)-Number(fresh.heldAmount||0);if(available<=0)throw new Error("NOTHING_TO_HOLD");
    const u=await (await collection<any>("users")).updateOne({_id:String(fresh.recipientId),coins:{$gte:available}},{$inc:{coins:-available},$set:{updatedAt:now}},{session});
    if(!u.modifiedCount)throw new Error("FUNDS_ALREADY_SPENT");
    await transfers.updateOne({_id:transferId},{$inc:{heldAmount:available,heldAmountUsd:Number((available/rate).toFixed(2))},$set:{status:"held",updatedAt:now}},{session});
    await (await collection<any>("coinTransactions")).insertOne({_id:mongoId(),userId:String(fresh.recipientId),type:"merchant_hold",amount:-available,reference:transferId,description:"Funds temporarily held by the sending merchant",createdAt:now},{session});
   }else{
    const held=Number(fresh.heldAmount||0);if(held<=0)throw new Error("NOTHING_HELD");
    const u=await (await collection<any>("users")).updateOne({_id:String(fresh.recipientId)},{$inc:{coins:held},$set:{updatedAt:now}},{session});if(!u.modifiedCount)throw new Error("RECIPIENT_MISSING");
    await transfers.updateOne({_id:transferId},{$set:{heldAmount:0,heldAmountUsd:0,status:"completed",updatedAt:now}},{session});
    await (await collection<any>("coinTransactions")).insertOne({_id:mongoId(),userId:String(fresh.recipientId),type:"merchant_release",amount:held,reference:transferId,description:"Previously held merchant funds released",createdAt:now},{session});
   }
  });}finally{await session.endSession()}
  try{await notifyUser(String(t.recipientId),action==="hold"?"Wallet funds temporarily held":"Wallet funds released",action==="hold"?"A merchant has temporarily held the remaining funds from a transfer.":"Held funds have been returned to your available wallet balance.",{type:"merchant_"+action,reference:transferId})}catch(e){console.error("[MERCHANT HOLD NOTIFICATION]",e)}
  return NextResponse.json({ok:true,status:action==="hold"?"held":"completed"});
 }catch(e){const m=e instanceof Error?e.message:"";const errors:any={FUNDS_ALREADY_SPENT:"The recipient has already spent some or all of these funds; the remaining amount cannot be held.",NOTHING_TO_HOLD:"There are no available funds left to hold.",NOTHING_HELD:"This transfer has no held funds to release."};return NextResponse.json({ok:false,error:errors[m]||"Unable to update transfer."},{status:errors[m]?409:400})}
}