import {NextResponse} from "next/server";
import crypto from "crypto";
import {requireUser} from "@/lib/auth";
import {collection,mongoId} from "@/lib/mongo";
import {createPaymentForm,packageIdForCoins} from "@/lib/zotlo";
import {getSettings} from "@/lib/settings";

export const runtime="nodejs";
export const dynamic="force-dynamic";

export async function POST(req:Request){
  try{
    const u=await requireUser();
    if(!u.verified_at)return NextResponse.json({ok:false,code:"EMAIL_VERIFICATION_REQUIRED",error:"Verify your email before buying coins."},{status:403});
    const body=await req.json();
    const coins=Math.floor(Number(body.coins));
    const settings=await getSettings();
    const pack=settings.coinPackages.find(p=>p.coins===coins);
    if(!pack)return NextResponse.json({ok:false,error:"This coin package is no longer available."},{status:400});
    const orderId="topup_"+crypto.randomUUID();
    const base=(process.env.NEXT_PUBLIC_APP_URL||"https://numelixa.com").replace(/\/$/,"");
    const ip=(req.headers.get("x-forwarded-for")||"").split(",")[0].trim()||"0.0.0.0";
    const form=await createPaymentForm({
      packageId:packageIdForCoins(coins),
      subscriberId:String(u.id),
      email:String(u.email||""),
      name:String(u.name||"Numelixa User"),
      ip,
      orderId,
      returnUrl:base+"/wallet?paid=1"
    });
    await (await collection("payments")).insertOne({
      _id:mongoId(),userId:u.id,provider:"zotlo",providerId:form.transactionId,
      orderId,amountUsd:Number(pack.priceUsd),coins,status:"pending",txid:null,
      packageId:packageIdForCoins(coins),raw:null,createdAt:new Date(),paidAt:null
    });
    return NextResponse.json({ok:true,url:form.url,transactionId:form.transactionId,coins,amount:Number(pack.priceUsd)});
  }catch(e){
    const m=e instanceof Error?e.message:"";
    console.error("[ZOTLO CREATE]",m);
    if(m==="AUTH_REQUIRED")return NextResponse.json({ok:false,error:"Please sign in to continue."},{status:401});
    if(m==="ZOTLO_PACKAGE_MAP_NOT_CONFIGURED"||m==="ZOTLO_PACKAGE_MAP_INVALID"||m==="ZOTLO_PACKAGE_NOT_CONFIGURED")
      return NextResponse.json({ok:false,error:"This coin package is not connected to a Zotlo package yet. Please configure its Zotlo package ID."},{status:503});
    if(m==="ZOTLO_NOT_CONFIGURED")return NextResponse.json({ok:false,error:"Zotlo payment is not configured yet."},{status:503});
    return NextResponse.json({ok:false,error:"Unable to start the payment right now. Please try again."},{status:502});
  }
}
