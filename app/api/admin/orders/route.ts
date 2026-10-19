import {NextResponse} from "next/server";import {requireAdmin} from "@/lib/auth";import {collection,mongoId} from "@/lib/mongo";import {cancelOrAlreadyClosed} from "@/lib/sms-provider";export const runtime="nodejs";export const dynamic="force-dynamic";
export async function GET(){try{await requireAdmin();const orders=await (await collection<any>("orders")).find({}).sort({createdAt:-1}).limit(500).toArray(),users=await collection<any>("users"),out=[];for(const o of orders){const u=await users.findOne({_id:o.userId},{projection:{email:1,name:1}});out.push({id:o._id,user_id:o.userId,name:u?.name||"",email:u?.email||"",provider_order_id:o.providerOrderId,service:o.service,service_display:({wa:"WhatsApp",whatsapp:"WhatsApp",tg:"Telegram",telegram:"Telegram",fb:"Facebook",facebook:"Facebook",ig:"Instagram",instagram:"Instagram",tt:"TikTok",tiktok:"TikTok",go:"Google",google:"Google",tw:"X",twitter:"X",am:"Amazon",amazon:"Amazon"} as Record<string,string>)[String(o.service||"").toLowerCase()]||String(o.service||"").replace(/[_-]+/g," ").replace(/\b\w/g,c=>c.toUpperCase()),country:o.country,country_code:o.countryCode,phone_number:o.phoneNumber,provider_cost_usd:o.providerCostUsd,price_coins:o.priceCoins,status:o.status,code:o.code,full_sms:o.fullSms,created_at:o.createdAt,expires_at:o.expiresAt,cancelled_at:o.cancelledAt,completed_at:o.completedAt,refund_coins:o.refundCoins||0})}return NextResponse.json({ok:true,orders:out})}catch(e){return NextResponse.json({ok:false,error:"Unauthorized"},{status:401})}}

export async function POST(req:Request){
 try{
  await requireAdmin();
  const body=await req.json().catch(()=>({}));
  const id=String(body.orderId||"").trim();
  if(!id)return NextResponse.json({ok:false,error:"Order ID is required."},{status:400});
  const orders=await collection<any>("orders");
  const order=await orders.findOne({_id:id});
  if(!order)return NextResponse.json({ok:false,error:"Order not found."},{status:404});
  if(String(order.status||"").toLowerCase()!=="waiting")return NextResponse.json({ok:false,error:"Only waiting orders can be cancelled."},{status:409});
  const provider=String(order.provider||"5sim").toLowerCase()==="tiger"?"tiger":"5sim";
  await cancelOrAlreadyClosed(String(order.providerOrderId||""),provider);
  const changed=await orders.findOneAndUpdate({_id:id,status:"waiting"},{$set:{status:"cancelled",cancelledAt:new Date(),refundCoins:Number(order.priceCoins||0)}},{returnDocument:"after"});
  if(!changed)return NextResponse.json({ok:false,error:"Order status changed before cancellation completed. Refresh orders to check its current status."},{status:409});
  const refund=Math.max(0,Number(order.priceCoins||0));
  const users=await collection<any>("users"),txs=await collection<any>("coinTransactions");
  const user=await users.findOneAndUpdate({_id:order.userId},{$inc:{coins:refund}},{returnDocument:"after"});
  if(refund>0)await txs.insertOne({_id:mongoId(),userId:order.userId,type:"refund",amount:refund,balanceAfter:Number(user?.coins||0),reference:id,description:"Admin cancelled waiting order",createdAt:new Date()});
  return NextResponse.json({ok:true,status:"cancelled",refundedCoins:refund,message:"Waiting order cancelled successfully; "+refund+" coins refunded."});
 }catch(e){const message=e instanceof Error?e.message:"";return NextResponse.json({ok:false,error:message||"Unable to cancel order. The provider may not have confirmed cancellation."},{status:502});}
}
