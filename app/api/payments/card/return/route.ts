import {NextResponse} from "next/server";
import {collection} from "@/lib/mongo";
import {POST as handleSifaloWebhook} from "../../sifalo/webhook/route";
export const runtime="nodejs";export const dynamic="force-dynamic";export const maxDuration=60;
export async function GET(req:Request){const url=new URL(req.url),orderId=String(url.searchParams.get("order_id")||""),sid=String(url.searchParams.get("sid")||"").trim();const target=new URL("https://secure.payment.numelixa.com/");target.searchParams.set("order_id",orderId);try{
 if(!/^sifalo_card_[0-9a-f-]{30,}$/i.test(orderId))throw new Error("Invalid card payment reference.");
 const payments=await collection<any>("payments"),payment=await payments.findOne({orderId,provider:"sifalo",method:"card"});if(!payment)throw new Error("Card payment not found.");
 if(payment.status==="paid"){target.searchParams.set("status","paid");return NextResponse.redirect(target);}
 const verifyUrl=String(process.env.SIFALO_ENV||"live").toLowerCase()==="staging"?"https://spay-api.sifalo.net/gateway/verify.php":"https://api.sifalopay.com/gateway/verify.php";
 const verifyBody:any=sid?{sid}:{order_id:orderId};const response=await fetch(verifyUrl,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(verifyBody),cache:"no-store",signal:AbortSignal.timeout(25000)});const verified:any=await response.json().catch(()=>null);
 if(!response.ok||!verified)throw new Error("Payment verification is temporarily unavailable.");
 if(String(verified.status||"").toLowerCase()==="success"&&Number(verified.code)===601){
  const callback=await handleSifaloWebhook(new Request(new URL("/hooks/sifalopay",req.url),{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({...verified,order_id:orderId})}));
  if(!callback.ok)throw new Error("Payment received; wallet credit is being reconciled.");
  target.searchParams.set("status","paid");
 }else{await payments.updateOne({orderId,provider:"sifalo",credited:{$ne:true}},{$set:{status:Number(verified.code)===600||Number(verified.code)===604?"failed":"pending",txid:String(verified.sid||sid||""),raw:verified,updatedAt:new Date()}});target.searchParams.set("status",Number(verified.code)===600||Number(verified.code)===604?"failed":"pending");}
 }catch(e){console.error("[SIFALO CARD RETURN]",e instanceof Error?e.message:e);target.searchParams.set("status","pending");if(orderId)target.searchParams.set("order_id",orderId);}
 return NextResponse.redirect(target);
}
