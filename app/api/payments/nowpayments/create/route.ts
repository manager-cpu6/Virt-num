import {NextResponse} from "next/server";
import {requireUser} from "@/lib/auth";
import {collection,mongoId} from "@/lib/mongo";
import {getSettings} from "@/lib/settings";

export const runtime="nodejs";
export const dynamic="force-dynamic";

const PACKS:{coins:number;priceUsd:number;url:string}[]=[
 {coins:36,priceUsd:0.77,url:"https://nowpayments.io/payment/?iid=5891936266"},
 {coins:75,priceUsd:1.65,url:"https://nowpayments.io/payment/?iid=4398514166"},
 {coins:250,priceUsd:5.49,url:"https://nowpayments.io/payment/?iid=4544066646"},
 {coins:499,priceUsd:10.99,url:"https://nowpayments.io/payment/?iid=6074779762"}
];

export async function POST(req:Request){
 try{
  const u=await requireUser();
  if(!u.verified_at)return NextResponse.json({ok:false,error:"Verify your email before buying coins."},{status:403});
  const body=await req.json();
  const coins=Math.floor(Number(body.coins));
  const pack=PACKS.find(x=>x.coins===coins);
  if(!pack)return NextResponse.json({ok:false,error:"Invalid coin package."},{status:400});

  const settings=await getSettings();
  const configured=settings.coinPackages.find((x:any)=>Number(x.coins)===coins);
  if(configured && Math.abs(Number(configured.priceUsd)-pack.priceUsd)>0.01)
    return NextResponse.json({ok:false,error:"Coin package pricing is temporarily unavailable."},{status:409});

  const orderId="nowpay_"+crypto.randomUUID();
  await (await collection("payments")).insertOne({
   _id:mongoId(),userId:String(u.id),provider:"nowpayments_link",providerId:null,
   orderId,amountUsd:pack.priceUsd,coins:pack.coins,status:"pending",txid:null,
   packageId:String(coins),raw:{paymentLink:pack.url},createdAt:new Date(),paidAt:null
  });

  return NextResponse.json({ok:true,url:pack.url,coins:pack.coins,amount:pack.priceUsd,orderId});
 }catch(e){
  const m=e instanceof Error?e.message:"";
  if(m==="AUTH_REQUIRED")return NextResponse.json({ok:false,error:"Please sign in to continue."},{status:401});
  console.error("[NOWPAYMENTS LINK]",m);
  return NextResponse.json({ok:false,error:"Unable to start the payment right now."},{status:500});
 }
}
