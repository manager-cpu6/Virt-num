import {NextResponse} from "next/server";import {collection,mongoId} from "@/lib/mongo";import {requireUser} from "@/lib/auth";import {purchase,cancel,getPrice} from "@/lib/fivesim";import {getSettings,sellCoins} from "@/lib/settings";
export const runtime="nodejs";export const dynamic="force-dynamic";
export async function POST(req:Request){let providerOrderId="",debitWritten=false,service="",country="",userId="";try{
 const u=await requireUser();userId=String(u.id||"");const fresh=await (await collection<any>("users")).findOne({_id:u.id});if(!fresh?.verifiedAt)return NextResponse.json({ok:false,code:"EMAIL_VERIFICATION_REQUIRED",error:"Verify your email before buying a number."},{status:403});
 const b=await req.json();service=String(b.service||"").trim();country=String(b.countryCode||b.country||"").trim();if(!service||!country)return NextResponse.json({ok:false,error:"Service and country are required."},{status:400});
 const settings=await getSettings();
 const operator=String(settings.providerOperator||"any").trim().toLowerCase()||"any";
 const quote=await getPrice(country,service,operator);
 if(!quote.count||!quote.cost)return NextResponse.json({ok:false,error:operator==="any"?"This service/country is currently out of stock.":"The selected 5SIM operator is currently out of stock for this service/country."},{status:409});
 const price=sellCoins(quote.cost,settings),users=await collection<any>("users"),txs=await collection<any>("coinTransactions"),orders=await collection<any>("orders"),id=mongoId();
 const updated=await users.findOneAndUpdate({_id:u.id,coins:{$gte:price}},{$inc:{coins:-price}},{returnDocument:"after"});if(!updated)return NextResponse.json({ok:false,error:"Insufficient coins. Please top up your wallet."},{status:402});
 try{
  const p=await purchase(country,service,Number(quote.cost),operator);providerOrderId=String(p.order_id||"");if(!providerOrderId)throw new Error("Provider did not return an activation ID.");
  const now=new Date(),expiresAt=new Date(now.getTime()+10*60*1000),number=String(p.number||"");await txs.insertOne({_id:mongoId(),userId:u.id,type:"debit",amount:-price,balanceAfter:Number(updated.coins||0),reference:id,description:"Number purchase: "+service+" / "+country,createdAt:now});debitWritten=true;
  await orders.insertOne({_id:id,userId:u.id,providerOrderId,service,country,countryCode:country,phoneNumber:number,providerCostUsd:Number(p.providerCost||quote.cost),providerOperator:String(p.operator||operator),priceCoins:price,status:"waiting",code:null,fullSms:null,expiresAt,createdAt:now,cancelledAt:null,completedAt:null,refundCoins:0});
  return NextResponse.json({ok:true,order:{id,number,price,expiresIn:600,stockAfter:Math.max(0,Number(quote.count)-1)}})
 }catch(e){
  try{if(providerOrderId)await cancel(providerOrderId)}catch{}
  const refund=await users.findOneAndUpdate({_id:u.id},{$inc:{coins:price}},{returnDocument:"after"});
  if(debitWritten)try{await txs.insertOne({_id:mongoId(),userId:u.id,type:"refund",amount:price,balanceAfter:Number(refund?.coins||0),reference:id,description:"Refund after failed order creation",createdAt:new Date()})}catch{}
  throw e
 }
 }catch(e){
 const m=e instanceof Error?e.message:"Order failed";
 console.error("[5SIM ORDER]",{message:m,service,country,userId});
 if(m==="AUTH_REQUIRED")return NextResponse.json({ok:false,error:"Please sign in to continue."},{status:401});
 if(m==="EMAIL_VERIFICATION_REQUIRED")return NextResponse.json({ok:false,code:"EMAIL_VERIFICATION_REQUIRED",error:m},{status:403});
 if(m==="PROVIDER_BALANCE_TOO_LOW")return NextResponse.json({ok:false,error:"The 5SIM provider balance is too low for this number. Please add more balance to the 5SIM account."},{status:502});
 if(m==="NO_FREE_PHONES"||/no free phones/i.test(m))return NextResponse.json({ok:false,error:"5SIM has no free number available for this service/country right now. Please refresh and try again."},{status:409});
 if(/not enough user balance/i.test(m))return NextResponse.json({ok:false,error:"The 5SIM provider account does not have enough balance for this purchase."},{status:502});
 if(/not enough rating/i.test(m))return NextResponse.json({ok:false,error:"The 5SIM provider account rating is too low to purchase this number."},{status:502});
 if(/bad country/i.test(m))return NextResponse.json({ok:false,error:"5SIM rejected this country code. The selected country is not accepted by the provider."},{status:502});
 if(/bad operator/i.test(m))return NextResponse.json({ok:false,error:"5SIM rejected the operator selection for this service."},{status:502});
 if(/no product/i.test(m))return NextResponse.json({ok:false,error:"5SIM does not currently offer this service in the selected country."},{status:409});
 if(/server offline/i.test(m))return NextResponse.json({ok:false,error:"5SIM is temporarily offline for this purchase. Please try again shortly."},{status:503});
 if(/HTTP 401|HTTP 403|unauthorized|invalid token|invalid api/i.test(m))return NextResponse.json({ok:false,error:"The 5SIM New Protocol API key is invalid or not authorized for purchases."},{status:502});
 return NextResponse.json({ok:false,error:"5SIM purchase failed. Please try again."},{status:502})
}}
export async function DELETE(req:Request){try{
 const u=await requireUser(),b=await req.json(),id=String(b.orderId||""),orders=await collection<any>("orders"),users=await collection<any>("users"),txs=await collection<any>("coinTransactions"),o=await orders.findOne({_id:id,userId:u.id});
 if(!o)return NextResponse.json({ok:false,error:"Order not found."},{status:404});if(o.status!=="waiting")return NextResponse.json({ok:false,error:"This order can no longer be cancelled."},{status:409});
 const age=Date.now()-new Date(o.createdAt).getTime();if(age>5*60*1000)return NextResponse.json({ok:false,error:"Cancel is available only during the first 5 minutes."},{status:409});
 await cancel(String(o.providerOrderId));const changed=await orders.findOneAndUpdate({_id:id,userId:u.id,status:"waiting"},{$set:{status:"cancelled",cancelledAt:new Date(),refundCoins:Number(o.priceCoins||0)}},{returnDocument:"after"});if(!changed)return NextResponse.json({ok:false,error:"Order status changed while cancelling."},{status:409});
 const refund=Number(o.priceCoins||0),updated=await users.findOneAndUpdate({_id:u.id},{$inc:{coins:refund}},{returnDocument:"after"});await txs.insertOne({_id:mongoId(),userId:u.id,type:"refund",amount:refund,balanceAfter:Number(updated?.coins||0),reference:id,description:"Cancelled number refund",createdAt:new Date()});return NextResponse.json({ok:true,refundedCoins:refund});
}catch{return NextResponse.json({ok:false,error:"Cancellation failed. Please try again."},{status:500})}}