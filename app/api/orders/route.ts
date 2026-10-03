import {NextResponse} from "next/server";import {collection,mongoId} from "@/lib/mongo";import {requireUser} from "@/lib/auth";import {purchase,cancel,getPrice} from "@/lib/smspool";import {getSettings,sellCoins} from "@/lib/settings";
export const runtime="nodejs";export const dynamic="force-dynamic";
export async function POST(req:Request){let providerOrderId="";try{
 const u=await requireUser(),fresh=await (await collection<any>("users")).findOne({_id:u.id});if(!fresh?.verifiedAt)return NextResponse.json({ok:false,code:"EMAIL_VERIFICATION_REQUIRED",error:"Verify your email before buying a number."},{status:403});
 const b=await req.json(),service=String(b.service||"").trim(),country=String(b.countryCode||b.country||"").trim();if(!service||!country)return NextResponse.json({ok:false,error:"Service and country are required."},{status:400});
 const quote=await getPrice(country,service);if(!quote.count||!quote.cost)return NextResponse.json({ok:false,error:"This service/country is currently out of stock."},{status:409});
 const settings=await getSettings(),price=sellCoins(quote.cost,settings);
 const users=await collection<any>("users"),txs=await collection<any>("coinTransactions"),orders=await collection<any>("orders"),id=mongoId();
 const updated=await users.findOneAndUpdate({_id:u.id,coins:{$gte:price}},{$inc:{coins:-price}},{returnDocument:"after"});
 if(!updated)return NextResponse.json({ok:false,error:"Insufficient coins. Please top up your wallet."},{status:402});
 try{
  const p=await purchase(country,service);providerOrderId=String(p.order_id||"");if(!providerOrderId)throw new Error("Provider did not return an activation ID.");
  const now=new Date(),expiresAt=new Date(now.getTime()+10*60*1000),number=String(p.number||"");
  const after=Number(updated.coins||0);
  await txs.insertOne({_id:mongoId(),userId:u.id,type:"debit",amount:-price,balanceAfter:after,reference:id,description:"Number purchase: "+service+" / "+country,createdAt:now});
  await orders.insertOne({_id:id,userId:u.id,providerOrderId,service,country,countryCode:country,phoneNumber:number,providerCostUsd:Number(quote.cost),priceCoins:price,status:"waiting",code:null,fullSms:null,expiresAt,createdAt:now,cancelledAt:null,completedAt:null,refundCoins:0});
  return NextResponse.json({ok:true,order:{id,number,price,expiresIn:600,stockAfter:Math.max(0,Number(quote.count)-1)}})
 }catch(e){await users.updateOne({_id:u.id},{$inc:{coins:price}});if(providerOrderId)try{await cancel(providerOrderId)}catch{}throw e}
 }catch(e){const m=e instanceof Error?e.message:"Order failed";if(m==="AUTH_REQUIRED")return NextResponse.json({ok:false,error:"Please sign in to continue."},{status:401});if(m==="EMAIL_VERIFICATION_REQUIRED")return NextResponse.json({ok:false,code:"EMAIL_VERIFICATION_REQUIRED",error:m},{status:403});return NextResponse.json({ok:false,error:m},{status:500})}}
