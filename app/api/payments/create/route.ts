import {NextResponse} from "next/server";
import {getPaymentSettings} from "@/lib/payment-settings";
export const runtime="nodejs";export const dynamic="force-dynamic";
export async function POST(req:Request){
 try{
  const s=await getPaymentSettings();const body=await req.clone().json();const target=s.activeProvider;
  if(target==="paypal"){
    const r=await fetch(new URL("/api/payments/paypal/create",req.url),{method:"POST",headers:req.headers,body:JSON.stringify(body)});return new NextResponse(await r.text(),{status:r.status,headers:{"Content-Type":"application/json"}});
  }
  const r=await fetch(new URL("/api/payments/nowpayments/create",req.url),{method:"POST",headers:req.headers,body:JSON.stringify(body)});return new NextResponse(await r.text(),{status:r.status,headers:{"Content-Type":"application/json"}});
 }catch{return NextResponse.json({ok:false,error:"Unable to start payment."},{status:500});}
}
