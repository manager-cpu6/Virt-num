import {NextResponse} from "next/server";
import crypto from "crypto";
import {requireUser} from "@/lib/auth";
import {collection,mongoId,getMongoClient} from "@/lib/mongo";
import {getSettings} from "@/lib/settings";
import {sendTransactionalEmail} from "@/lib/email-system";

export const runtime="nodejs";
export const dynamic="force-dynamic";

export async function POST(req:Request){
 try{
  const user=await requireUser(),body=await req.json().catch(()=>({}));
  const code=String(body?.code||"").trim().toUpperCase().replace(/\s+/g,"").slice(0,48);
  if(!/^[A-Z0-9-]{6,48}$/.test(code))return NextResponse.json({ok:false,error:"Enter a valid voucher code."},{status:400});
  const settings=await getSettings(),users=await collection<any>("users"),vouchers=await collection<any>("vouchers"),userId=String(user.id),now=new Date(),receiptNumber="NXV-"+now.getTime().toString(36).toUpperCase()+"-"+crypto.randomBytes(3).toString("hex").toUpperCase();
  let amountUsd=0,creditedCoins=0,balanceAfter=0,voucherCode=code;
  const session=getMongoClient().startSession();
  try{
   await session.withTransaction(async()=>{
    const voucher=await vouchers.findOne({code,status:"active",expiresAt:{$gt:now}}, {session});
    if(!voucher)throw new Error("VOUCHER_INVALID");
    if(Array.isArray(voucher.redeemedBy)&&voucher.redeemedBy.includes(userId))throw new Error("VOUCHER_ALREADY_USED");
    const max=Math.max(1,Math.floor(Number(voucher.maxRedemptions||1))),used=Math.max(0,Math.floor(Number(voucher.redemptions||0)));
    if(used>=max)throw new Error("VOUCHER_EXHAUSTED");
    amountUsd=Number(voucher.amountUsd||0);
    if(!Number.isFinite(amountUsd)||amountUsd<=0||amountUsd>100000)throw new Error("VOUCHER_INVALID");
    creditedCoins=Math.round(amountUsd*(Number(settings.coinsPerUsd)||100));
    const claimed=await vouchers.updateOne({_id:voucher._id,status:"active",redemptions:{$lt:max},redeemedBy:{$ne:userId}},{$inc:{redemptions:1},$addToSet:{redeemedBy:userId},$set:{lastRedeemedAt:now}},{session});
    if(!claimed.modifiedCount)throw new Error("VOUCHER_ALREADY_USED");
    const updated=await users.findOneAndUpdate({_id:userId},{$inc:{coins:creditedCoins}},{session,returnDocument:"after"});
    if(!updated)throw new Error("VOUCHER_USER_NOT_FOUND");
    balanceAfter=Number(updated.coins||0);
    await collection<any>("coinTransactions").then(c=>c.insertOne({_id:mongoId(),userId,type:"credit",amount:creditedCoins,balanceAfter,reference:receiptNumber,description:"Voucher redemption · "+code,createdAt:now},{session}));
    if(used+1>=max)await vouchers.updateOne({_id:voucher._id},{$set:{status:"redeemed",redeemedAt:now}},{session});
   });
  }finally{await session.endSession()}
  const owner=await users.findOne({_id:userId},{projection:{email:1,name:1}});
  const balanceUsd=balanceAfter/(Number(settings.coinsPerUsd)||100);
  let emailSent=false;
  try{if(owner?.email){await sendTransactionalEmail("voucher_redeemed",String(owner.email),{USER_NAME:String(owner.name||"there"),VOUCHER_CODE:voucherCode,AMOUNT:amountUsd.toFixed(2),CURRENCY:"USD",NEW_BALANCE:balanceUsd.toFixed(2),RECEIPT_NUMBER:receiptNumber,REDEEMED_DATE:now.toISOString(),WALLET_URL:"https://numelixa.com/wallet"},"voucher-redeemed:"+receiptNumber);emailSent=true}}catch(error){console.error("[VOUCHER RECEIPT EMAIL]",error instanceof Error?error.message:"send failed")}
  return NextResponse.json({ok:true,receipt:{receiptNumber,code:voucherCode,amountUsd,creditedCoins,balanceUsd,redeemedAt:now.toISOString(),status:"success"},emailSent},{headers:{"Cache-Control":"no-store"}});
 }catch(error){
  const code=error instanceof Error?error.message:"";
  const known:Record<string,string>={VOUCHER_INVALID:"This voucher is invalid, expired or unavailable.",VOUCHER_ALREADY_USED:"This voucher has already been redeemed by your account.",VOUCHER_EXHAUSTED:"This voucher has reached its redemption limit.",VOUCHER_USER_NOT_FOUND:"Your account could not be updated."};
  return NextResponse.json({ok:false,error:known[code]||"Unable to redeem this voucher. Please try again."},{status:code==="VOUCHER_INVALID"?404:code==="VOUCHER_ALREADY_USED"||code==="VOUCHER_EXHAUSTED"?409:500});
 }
}
