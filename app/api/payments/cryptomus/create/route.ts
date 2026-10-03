import {NextResponse} from "next/server";
import crypto from "crypto";
import {requireUser} from "@/lib/auth";
import {collection,mongoId} from "@/lib/mongo";
import {createInvoice} from "@/lib/cryptomus";
import {getSettings} from "@/lib/settings";

export const runtime="nodejs";
export const dynamic="force-dynamic";

export async function POST(req:Request){
  try{
    const u=await requireUser();
    if(!u.verified_at)return NextResponse.json({ok:false,code:"EMAIL_VERIFICATION_REQUIRED",error:"Verify your email before buying coins."},{status:403});

    const body=await req.json();
    const requestedCoins=Math.floor(Number(body.coins));
    const settings=await getSettings();
    const pack=settings.coinPackages.find(p=>p.coins===requestedCoins);
    if(!pack)return NextResponse.json({ok:false,error:"This coin package is no longer available."},{status:400});

    const amount=Number(pack.priceUsd);
    if(!Number.isFinite(amount)||amount<settings.minTopupUsd||amount>settings.maxTopupUsd)return NextResponse.json({ok:false,error:"This coin package is outside the current payment limits."},{status:400});

    const orderId="topup_"+crypto.randomUUID();
    const base=(process.env.NEXT_PUBLIC_APP_URL||"https://numelixa.com").replace(/\/$/,"");
    const p=await createInvoice({
      amount:amount.toFixed(2),
      order_id:orderId,
      url_return:base,
      url_success:base+"/wallet?paid=1",
      url_callback:base+"/api/payments/cryptomus/webhook"
    });

    await (await collection("payments")).insertOne({
      _id:mongoId(),
      userId:u.id,
      provider:"cryptomus",
      providerId:p.uuid,
      orderId,
      amountUsd:amount,
      coins:requestedCoins,
      status:"pending",
      txid:null,
      raw:null,
      createdAt:new Date(),
      paidAt:null
    });

    return NextResponse.json({ok:true,url:p.url,uuid:p.uuid,coins:requestedCoins,amount});
  }catch(e){
    const code=e instanceof Error?e.message:"";
    if(code==="PAYMENT_PENDING_APPROVAL")return NextResponse.json({ok:false,code,error:"Crypto payments are waiting for merchant approval. Please try again after Cryptomus approves the project."},{status:503});
    if(code==="PAYMENT_BLOCKED")return NextResponse.json({ok:false,code,error:"Crypto payments are temporarily unavailable for this merchant."},{status:503});
    return NextResponse.json({ok:false,error:"Unable to start the payment right now. Please try again."},{status:500});
  }
}
