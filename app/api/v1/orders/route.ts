import {NextResponse} from "next/server";
import {POST as purchaseOrder} from "@/app/api/orders/route";
import {requireUser} from "@/lib/auth";
import {getSettings} from "@/lib/settings";
import {collection} from "@/lib/mongo";
import {deliverDeveloperWebhook} from "@/lib/developer-webhook";

export const runtime="nodejs";
export const dynamic="force-dynamic";

export async function POST(req:Request){
 const response=await purchaseOrder(req);
 if(response.ok){
  try{
   const u=await requireUser(),payload=await response.clone().json();
   if(payload?.ok&&payload?.order)await deliverDeveloperWebhook(u.id,"order.created",{order:payload.order});
  }catch(error){console.error("[API ORDER WEBHOOK]",error)}
 }
 return response;
}

export async function GET(req:Request){
 try{
  const u=await requireUser();
  const pricing=await getSettings();
  const q=new URL(req.url).searchParams;
  const limit=Math.min(Math.max(Number(q.get("limit")||25),1),100);
  const status=q.get("status")||"";
  const filter:any={userId:u.id};
  if(status)filter.status=status;
  const rows=await (await collection<any>("orders")).find(filter).sort({createdAt:-1}).limit(limit).toArray();
  return NextResponse.json({
   ok:true,
   orders:rows.map((o:any)=>({
    id:String(o._id),service:o.service,
    country:o.country,countryCode:o.countryCode,phone:o.phoneNumber,
    price:Number(((Number(o.priceCoins)||0)/(Number(pricing.coinsPerUsd)||100)).toFixed(2)),currency:"USD",status:o.status,code:o.code||null,
    fullSms:o.fullSms||null,
    expiresAt:o.expiresAt,createdAt:o.createdAt,completedAt:o.completedAt||null
   })),
   count:rows.length
  });
 }catch{
  return NextResponse.json({ok:false,error:"Unauthorized."},{status:401});
 }
}
