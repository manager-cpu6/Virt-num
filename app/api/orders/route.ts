import {NextResponse} from "next/server";
import crypto from "crypto";
import {db,tx} from "@/lib/db";
import {requireUser} from "@/lib/auth";
import {purchase,cancel} from "@/lib/smspool";
export async function POST(req:Request){
 let providerOrderId="";
 try{
  const u=await requireUser();const b=await req.json();
  const service=String(b.service||"").trim();const country=String(b.countryCode||b.country||"").trim();const countryCode=country;
  if(!service||!country)return NextResponse.json({ok:false,error:"Service and country are required."},{status:400});
  const id=crypto.randomUUID();const p=await purchase(country,service);providerOrderId=String(p?.order_id||"");
  if(!p?.success||!providerOrderId)return NextResponse.json({ok:false,error:p?.type||p?.message||"No number available."},{status:409});
  const cost=Number(p.cost||0),price=Math.ceil(cost*(1+Number(process.env.PRICE_MARKUP_PERCENT||25)/100)*Number(process.env.COINS_PER_USD||100));
  try{
   const order=await tx(async c=>{
    const bal=await c.query<any>("SELECT coins FROM users WHERE id=$1 FOR UPDATE",[u.id]);
    if(Number(bal.rows[0]?.coins||0)<price)throw new Error("INSUFFICIENT_COINS");
    const after=Number(bal.rows[0].coins)-price;
    await c.query("UPDATE users SET coins=$1 WHERE id=$2",[after,u.id]);
    await c.query("INSERT INTO coin_transactions(id,user_id,type,amount,balance_after,reference,description) VALUES($1,$2,'debit',$3,$4,$5,$6)",[crypto.randomUUID(),u.id,-price,after,id,"Number purchase: "+service+" / "+country]);
    await c.query("INSERT INTO orders(id,user_id,provider_order_id,service,country,country_code,phone_number,provider_cost_usd,price_coins,status,expires_at) VALUES($1,$2,$3,$4,$5,$6,$7,$8,$9,'waiting',to_timestamp($10))",[id,u.id,providerOrderId,service,p.country||country,countryCode,String(p.number||p.phonenumber||""),cost,price,Number(p.expiration||Math.floor(Date.now()/1000)+Number(p.expires_in||1200))]);
    return{id,number:p.number||p.phonenumber,price,expiresIn:p.expires_in};
   });return NextResponse.json({ok:true,order});
  }catch(e){try{await cancel(providerOrderId)}catch{}throw e}
 }catch(e){
  const m=e instanceof Error?e.message:"Order failed";
  if(m==="AUTH_REQUIRED")return NextResponse.json({ok:false,error:"Please sign in to continue."},{status:401});
  if(m==="INSUFFICIENT_COINS")return NextResponse.json({ok:false,error:"Insufficient coins. Please top up your wallet."},{status:402});
  return NextResponse.json({ok:false,error:m},{status:500});
 }
}