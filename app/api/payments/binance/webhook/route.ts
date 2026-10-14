import {NextResponse} from "next/server";
import crypto from "crypto";
import {collection,mongoId} from "@/lib/mongo";
import {notifyUser} from "@/lib/notifications";

export const runtime="nodejs";
export const dynamic="force-dynamic";

function validSignature(headers:Headers,raw:string){
 const signature=headers.get("binancepay-signature")||"";
 const timestamp=headers.get("binancepay-timestamp")||"";
 const nonce=headers.get("binancepay-nonce")||"";
 const cert=headers.get("binancepay-certificate-sn")||"";
 const expectedCert=String(process.env.BINANCE_PAY_CERT_SERIAL||process.env.BINANCE_PAY_API_KEY||"");
 if(!signature||!timestamp||!nonce||!cert||cert!==expectedCert)return false;
 const publicKey=String(process.env.BINANCE_PAY_PUBLIC_KEY||"").replace(/\\n/g,"\n");
 try{return crypto.verify("RSA-SHA256",Buffer.from(timestamp+"\n"+nonce+"\n"+raw+"\n"),publicKey,Buffer.from(signature,"base64"));}catch{return false;}
}
export async function POST(req:Request){
 try{
  const raw=await req.text();
  if(!validSignature(req.headers,raw))return NextResponse.json({returnCode:"FAIL",returnMessage:"Invalid signature"},{status:401});
  const body:any=JSON.parse(raw);
  const data=body?.data||body;
  const orderId=String(data?.merchantTradeNo||"");
  if(!orderId)return NextResponse.json({returnCode:"SUCCESS",returnMessage:"OK"});
  const payments=await collection<any>("payments");
  const p=await payments.findOne({orderId,provider:"binance"});
  if(!p)return NextResponse.json({returnCode:"SUCCESS",returnMessage:"OK"});
  const status=String(data?.bizStatus||body?.bizStatus||"").toUpperCase();
  if(status!=="PAY_SUCCESS")return NextResponse.json({returnCode:"SUCCESS",returnMessage:"OK"});
  const paidAmount=Number(data?.totalFee??data?.orderAmount??p.amountCrypto);
  if(Number.isFinite(paidAmount)&&paidAmount>0&&Math.abs(paidAmount-Number(p.amountCrypto||p.amountUsd))>0.01){
   console.error("[BINANCE PAY] amount mismatch",orderId,paidAmount,p.amountCrypto);
   return NextResponse.json({returnCode:"FAIL",returnMessage:"Amount mismatch"},{status:400});
  }
  const txid=String(data?.transactionId||data?.transId||data?.bizId||p.txid||"");
  const claimed=await payments.findOneAndUpdate({_id:p._id,status:{$ne:"paid"}},{$set:{status:"paid",txid,raw:body,paidAt:new Date(),updatedAt:new Date()}},{returnDocument:"before"});
  if(!claimed)return NextResponse.json({returnCode:"SUCCESS",returnMessage:"Already processed"});
  const users=await collection<any>("users");
  const user=await users.findOneAndUpdate({_id:String(p.userId)},{$inc:{coins:Number(p.coins)}},{returnDocument:"after"});
  if(!user)throw new Error("Payment user not found");
  await (await collection("coinTransactions")).insertOne({_id:mongoId(),userId:String(p.userId),type:"credit",amount:Number(p.coins),balanceAfter:Number(user.coins),reference:p.orderId,description:"Binance Pay USDT wallet top-up",createdAt:new Date()});
  try{await notifyUser(String(p.userId),"💰 Payment confirmed","Your wallet was credited with "+Number(p.coins).toLocaleString()+" coins.",{paymentId:String(p._id),type:"payment"});}catch(e){console.error("[BINANCE PAY PUSH]",e);}
  return NextResponse.json({returnCode:"SUCCESS",returnMessage:"OK"});
 }catch(e){console.error("[BINANCE PAY WEBHOOK]",e);return NextResponse.json({returnCode:"FAIL",returnMessage:"Webhook processing failed"},{status:500});}
}
