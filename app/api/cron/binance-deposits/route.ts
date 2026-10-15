import {NextResponse} from "next/server";
import {collection,getMongoClient,getMongoDb,mongoId} from "@/lib/mongo";
import {getCoinDeposits,personalApiConfigured,type BinanceDeposit} from "@/lib/binance-personal";
import {notifyUser} from "@/lib/notifications";

export const runtime="nodejs";
export const dynamic="force-dynamic";
export const maxDuration=60;

function authorized(req:Request){
 const secret=String(process.env.CRON_SECRET||process.env.NUMELIXA_CRON_SECRET||"").trim();
 return Boolean(secret)&&req.headers.get("authorization")==="Bearer "+secret;
}
function norm(v:any){return String(v||"").trim().toLowerCase()}
async function creditDeposit(payment:any,deposit:BinanceDeposit){
 const client=getMongoClient(),db=await getMongoDb(),session=client.startSession();
 let credited:any=null;
 try{
  await session.withTransaction(async()=>{
   const payments=db.collection<any>("payments"),users=db.collection<any>("users"),txs=db.collection<any>("coinTransactions");
   const already=await payments.findOne({provider:"binance_personal",txid:String(deposit.txId)}, {session});
   if(already)return;
   const claimed=await payments.findOneAndUpdate(
    {_id:payment._id,provider:"binance_personal",status:"pending",txid:null},
    {$set:{status:"paid",txid:String(deposit.txId),raw:deposit,paidAt:new Date(),updatedAt:new Date(),binanceDepositId:String(deposit.id||""),binanceDepositTime:new Date(Number(deposit.insertTime))}},
    {returnDocument:"after",session}
   );
   if(!claimed)return;
   const user=await users.findOneAndUpdate({_id:String(payment.userId)},{$inc:{coins:Number(payment.coins)}},{returnDocument:"after",session});
   if(!user)throw new Error("BINANCE_DEPOSIT_USER_NOT_FOUND");
   await txs.insertOne({_id:mongoId(),userId:String(payment.userId),type:"credit",amount:Number(payment.coins),balanceAfter:Number(user.coins),reference:String(payment.orderId),description:"Binance Personal USDT deposit "+String(deposit.txId),depositTxId:String(deposit.txId),createdAt:new Date()},{session});
   credited={userId:String(payment.userId),coins:Number(payment.coins),orderId:String(payment.orderId),paymentId:String(payment._id)};
  });
 }finally{await session.endSession();}
 if(credited){
  try{await notifyUser(credited.userId,"💰 Binance deposit confirmed","Your crypto deposit was confirmed and "+credited.coins.toLocaleString()+" coins were added to your Numelixa wallet.",{paymentId:credited.paymentId,type:"payment"});}catch(e){console.error("[BINANCE DEPOSIT PUSH]",e);}
 }
 return Boolean(credited);
}
export async function GET(req:Request){
 if(!authorized(req))return NextResponse.json({ok:false,error:"Unauthorized"},{status:401});
 if(!personalApiConfigured())return NextResponse.json({ok:false,error:"Binance Personal API is not configured."},{status:503});
 try{
  const now=Date.now(),payments=await collection<any>("payments");
  await payments.updateMany({provider:"binance_personal",status:"pending",expiresAt:{$lte:new Date(now)}},{$set:{status:"expired",updatedAt:new Date()}});
  const pending=await payments.find({provider:"binance_personal",status:"pending",createdAt:{$gte:new Date(now-90*60*1000)},expiresAt:{$gt:new Date(now)}}).sort({createdAt:1}).limit(500).toArray();
  if(!pending.length)return NextResponse.json({ok:true,checked:0,credited:0,matched:0});
  const assets=[...new Set(pending.map(p=>String(p.cryptoCurrency||"USDT").toUpperCase()))].filter(c=>["USDT","BNB"].includes(c));
  const depositsByAsset=await Promise.all(assets.map(async coin=>({coin,deposits:await getCoinDeposits(coin,now-90*60*1000,now)})));
  let credited=0,matched=0,checked=0;
  for(const group of depositsByAsset){
   checked+=group.deposits.length;
   for(const d of group.deposits){
    if(Number(d.status)!==1||norm(d.coin)!==norm(group.coin)||!String(d.txId||"")||!Number.isFinite(Number(d.insertTime)))continue;
    const amount=Number(d.amount),time=Number(d.insertTime);
    if(!Number.isFinite(amount)||amount<=0)continue;
    const candidates=pending.filter(p=>
     p.status==="pending"&&norm(p.cryptoCurrency||"USDT")===norm(group.coin)&&Number(p.exact_amount??p.amountCrypto)===amount&&
     norm(p.depositAddress)===norm(d.address)&&norm(p.depositNetwork)===norm(d.network)&&
     time>=new Date(p.createdAt).getTime()&&time<=new Date(p.expiresAt).getTime()
    );
    if(candidates.length!==1)continue;
    matched++;
    try{if(await creditDeposit(candidates[0],d)){credited++;candidates[0].status="paid";}}catch(e){console.error("[BINANCE DEPOSIT CREDIT]",e instanceof Error?e.message:String(e));}
   }
  }
  return NextResponse.json({ok:true,checked,pending:pending.length,matched,credited});
 }catch(e){
  const message=e instanceof Error?e.message:"";
  console.error("[BINANCE DEPOSIT SYNC]",message);
  const error=message==="BINANCE_PERSONAL_API_NOT_CONFIGURED"?"Binance Personal API is not configured.":message==="BINANCE_PERSONAL_API_KEY_INVALID"?"Binance API credentials were rejected.":"Unable to synchronize Binance deposits.";
  return NextResponse.json({ok:false,error},{status:502});
 }
}
