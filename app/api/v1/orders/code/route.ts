import {POST as checkCode} from "@/app/api/orders/code/route";
import {requireUser} from "@/lib/auth";
import {deliverDeveloperWebhook} from "@/lib/developer-webhook";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function POST(req:Request){
 const response=await checkCode(req);
 if(response.ok){
  try{
   const payload=await response.clone().json();
   const code=payload?.code||payload?.order?.code||payload?.sms?.code;
   if(payload?.ok&&code){const u=await requireUser();await deliverDeveloperWebhook(u.id,"order.code_received",{...payload,code})}
  }catch(error){console.error("[API CODE WEBHOOK]",error)}
 }
 return response;
}