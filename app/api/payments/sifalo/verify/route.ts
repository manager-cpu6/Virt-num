import {NextResponse} from "next/server";
import {requireUser} from "@/lib/auth";
import {collection} from "@/lib/mongo";
import {POST as handleSifaloWebhook} from "../webhook/route";

export const runtime="nodejs";
export const dynamic="force-dynamic";

export async function GET(req:Request){
 try{
  const user=await requireUser();
  const verifyUrl=new URL(req.url);
  const orderId=verifyUrl.searchParams.get("orderId")||"";
  const returnedSid=String(verifyUrl.searchParams.get("sid")||"").trim();
  if(!orderId)return NextResponse.json({ok:false,error:"Payment order is required."},{status:400});
  const payments=await collection<any>("payments");
  const p=await payments.findOne({orderId,provider:"sifalo",userId:String(user.id)});
  if(!p)return NextResponse.json({ok:false,error:"Payment request was not found."},{status:404});
  if(p.status==="paid"&&p.credited===true)return NextResponse.json({ok:true,status:"paid",coins:Number(p.coins),paidAt:p.paidAt||null});
  const apiBase=String(process.env.SIFALO_ENV||"live").toLowerCase()==="staging"
   ?"https://spay-api.sifalo.net/gateway/verify.php"
   :"https://api.sifalopay.com/gateway/verify.php";
  const verifyBody:any={order_id:p.orderId};
  if(p.txid||returnedSid)verifyBody.sid=String(p.txid||returnedSid);
  const response=await fetch(apiBase,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(verifyBody),cache:"no-store",signal:AbortSignal.timeout(20000)});
  const result:any=await response.json().catch(()=>null);
  if(!response.ok||!result)return NextResponse.json({ok:false,error:"Sifalo could not verify this payment yet."},{status:502});
  const callbackBody={...result,order_id:String(result.order_id||p.orderId)};
  const callbackResponse=await handleSifaloWebhook(new Request(new URL("../webhook",req.url),{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(callbackBody)}));
  if(!callbackResponse.ok)return NextResponse.json({ok:false,error:"Payment status was received but wallet reconciliation needs another check."},{status:502});
  const latest=await payments.findOne({orderId:p.orderId,provider:"sifalo",userId:String(user.id)});
  return NextResponse.json({ok:true,status:String(latest?.status||"pending"),coins:Number(latest?.coins||p.coins),paidAt:latest?.paidAt||null},{headers:{"Cache-Control":"no-store, max-age=0"}});
 }catch(e){
  if(e instanceof Error&&e.message==="AUTH_REQUIRED")return NextResponse.json({ok:false,error:"Please sign in to check this payment."},{status:401});
  console.error("[SIFALO VERIFY]",e instanceof Error?e.message:"verification failed");
  return NextResponse.json({ok:false,error:"Unable to verify this payment right now."},{status:500});
 }
}
