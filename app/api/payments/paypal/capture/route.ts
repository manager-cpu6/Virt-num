import {NextResponse} from "next/server";
import {collection} from "@/lib/mongo";
import {requireUser} from "@/lib/auth";
import {paypalApi} from "@/lib/paypal";
import {notifyUser} from "@/lib/notifications";
import {mongoId} from "@/lib/mongo";
export const runtime="nodejs";export const dynamic="force-dynamic";
export async function POST(req:Request){
 try{
  const u=await requireUser(); const body:any=await req.json(),paypalOrderId=String(body.orderId||"");if(!paypalOrderId)return NextResponse.json({ok:false,error:"Missing PayPal order ID."},{status:400});
  const p=await (await collection<any>("payments")).findOne({provider:"paypal",providerId:paypalOrderId});if(!p)return NextResponse.json({ok:false,error:"Payment not found."},{status:404});
  if(String(p.userId)!==String(u.id))return NextResponse.json({ok:false,error:"Payment does not belong to this account."},{status:403});
  if(p.status==="paid")return NextResponse.json({ok:true,alreadyPaid:true,coins:Number(p.coins)});
  const result:any=await paypalApi("/v2/checkout/orders/"+encodeURIComponent(paypalOrderId)+"/capture",{method:"POST",body:"{}"});
  const capture=result?.purchase_units?.[0]?.payments?.captures?.[0];if(String(result?.status||"")!=="COMPLETED"||String(capture?.status||"")!=="COMPLETED")return NextResponse.json({ok:false,error:"PayPal payment is not completed."},{status:409});
  const payments=await collection<any>("payments");
  const claimed=await payments.findOneAndUpdate({_id:p._id,status:{$ne:"paid"}},{$set:{status:"paid",txid:String(capture?.id||""),raw:result,paidAt:new Date(),updatedAt:new Date()}},{returnDocument:"before"});
  if(!claimed)return NextResponse.json({ok:true,alreadyPaid:true});
  const users=await collection<any>("users");const updated=await users.findOneAndUpdate({_id:String(p.userId)},{$inc:{coins:Number(p.coins)}},{returnDocument:"after"});
  if(!updated)throw new Error("Payment user not found");
  await (await collection("coinTransactions")).insertOne({_id:mongoId(),userId:String(p.userId),type:"credit",amount:Number(p.coins),balanceAfter:Number(updated.coins),reference:p.orderId,description:"PayPal wallet top-up",createdAt:new Date()});
  try{await notifyUser(String(p.userId),"💰 Payment confirmed","Your wallet was credited with "+Number(p.coins).toLocaleString()+" coins.",{paymentId:String(p._id),type:"payment"});}catch(error){console.error("[PAYPAL PUSH]",error);}
  return NextResponse.json({ok:true,coins:Number(p.coins),balance:Number(updated.coins)});
 }catch(e){const m=e instanceof Error?e.message:"";if(m==="AUTH_REQUIRED")return NextResponse.json({ok:false,error:"Please sign in to continue."},{status:401});console.error("[PAYPAL CAPTURE]",e);return NextResponse.json({ok:false,error:"Unable to confirm PayPal payment."},{status:500});}
}
