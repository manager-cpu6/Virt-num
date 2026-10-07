import {NextResponse} from "next/server";
import {requireAdmin} from "@/lib/auth";
import {collection} from "@/lib/mongo";
import {configured,balance,providerName} from "@/lib/sms-provider";
import {getSettings} from "@/lib/settings";
import * as fiveSim from "@/lib/fivesim";
import * as tigerSms from "@/lib/tigersms";

export const runtime="nodejs";
export const dynamic="force-dynamic";

export async function GET(){
  try{
    await requireAdmin();
    const users=await collection<any>("users"),orders=await collection<any>("orders"),txs=await collection<any>("coinTransactions"),now=new Date(),start=new Date(now.getFullYear(),now.getMonth(),now.getDate());
    const [uc,verified,active,today,rev,wallet,orderStatuses,topServices]=await Promise.all([
      users.countDocuments(),
      users.countDocuments({verifiedAt:{$ne:null}}),
      orders.countDocuments({status:"active"}),
      orders.countDocuments({createdAt:{$gte:start}}),
      txs.aggregate([{$match:{type:"credit"}},{$group:{_id:null,total:{$sum:"$amount"}}}]).toArray(),
      users.aggregate([{$group:{_id:null,total:{$sum:{$convert:{input:"$coins",to:"double",onError:0,onNull:0}}}}}]).toArray(),
      orders.aggregate([{$group:{_id:"$status",count:{$sum:1}}},{$sort:{count:-1}}]).toArray(),
      orders.aggregate([{$group:{_id:"$service",count:{$sum:1},coins:{$sum:{$convert:{input:"$priceCoins",to:"double",onError:0,onNull:0}}}}},{$sort:{count:-1}},{$limit:8}]).toArray()
    ]);
    const settings=await getSettings();
    const activeProviderName=await providerName();
    let sms:any={name:"5SIM",status:settings.provider5simEnabled?(activeProviderName==="5SIM"?"active":"standby"):"disabled",enabled:settings.provider5simEnabled};
    let tiger:any={name:"Tiger SMS",status:settings.providerTigerEnabled?(activeProviderName==="Tiger SMS"?"active":"standby"):"disabled",enabled:settings.providerTigerEnabled};
    if(settings.provider5simEnabled){try{sms.balance=await fiveSim.balance()}catch{sms.status=sms.status==="active"?"error":sms.status}}
    if(settings.providerTigerEnabled){try{tiger.balance=await tigerSms.balance()}catch{tiger.status=tiger.status==="active"?"error":tiger.status}}
    return NextResponse.json({
      ok:true,
      users:uc,
      verifiedUsers:verified,
      activeNumbers:active,
      todayOrders:today,
      revenueCoins:Number(rev[0]?.total||0),
      walletCoins:Number(wallet[0]?.total||0),
      orderStatuses:orderStatuses.map((x:any)=>({status:String(x._id||"unknown"),count:Number(x.count||0)})),
      topServices:topServices.map((x:any)=>({service:String(x._id||"unknown"),count:Number(x.count||0),coins:Number(x.coins||0)})),
      settings,
      providers:[sms,tiger,
        {name:"Cryptomus",status:(process.env.CRYPTOMUS_PAYMENT_API_KEY||process.env.CRYPTOMUS_API_KEY)?"configured":"missing"},
        {name:"Spacemail",status:process.env.SPACEMAIL_SMTP_USER?"configured":"missing"}
      ]
    });
  }catch(e){
    return NextResponse.json({ok:false,error:e instanceof Error?e.message:"Admin error"},{status:401});
  }
}

export async function POST(req:Request){
  try{
    await requireAdmin();
    const b=await req.json();
    if(b.providerControl===true){
      const next5=b.provider5simEnabled===true;
      const nextTiger=b.providerTigerEnabled===true;
      if(!next5&&!nextTiger)return NextResponse.json({ok:false,error:"At least one SMS provider must remain enabled."},{status:400});
      const selected=b.smsProvider==="tiger"?"tiger":"5sim";
      if(selected==="5sim"&&!next5)return NextResponse.json({ok:false,error:"Enable 5SIM before making it active."},{status:400});
      if(selected==="tiger"&&!nextTiger)return NextResponse.json({ok:false,error:"Enable Tiger SMS before making it active."},{status:400});
      const current=await getSettings();
      await (await collection<any>("settings")).updateOne({_id:"pricing"},{$set:{provider5simEnabled:next5,providerTigerEnabled:nextTiger,smsProvider:selected,updatedAt:new Date()}},{upsert:true});
      return NextResponse.json({ok:true,settings:await getSettings()});
    }
    const markupPercent=Number(b.markupPercent),coinsPerUsd=Number(b.coinsPerUsd),minTopupUsd=Number(b.minTopupUsd),maxTopupUsd=Number(b.maxTopupUsd);
    const providerOperator=String(b.providerOperator||"any").trim().toLowerCase()||"any";
    const currentSettings=await getSettings();
    const smsProvider=b.smsProvider==="tiger"?"tiger":"5sim";
    if(smsProvider==="tiger"&&!String(process.env.TIGER_SMS_API_KEY||process.env.TIGERSMS_API_KEY||"").trim())return NextResponse.json({ok:false,error:"Tiger SMS API key is not configured. Add TIGER_SMS_API_KEY in Vercel first."},{status:400});
    if(smsProvider==="5sim"&&!String(process.env.FIVESIM_API_KEY||process.env.SMSACTIVATE_API_KEY||"").trim())return NextResponse.json({ok:false,error:"5SIM API key is not configured."},{status:400});
    const providerOperators=Array.from(new Set((Array.isArray(b.providerOperators)?b.providerOperators:[]).map((x:any)=>String(x).trim().toLowerCase()).filter(Boolean).concat("any"))).slice(0,50);
    if(!providerOperators.includes(providerOperator))return NextResponse.json({ok:false,error:"Selected 5SIM operator must be in the operator list."},{status:400});
    if(!Number.isFinite(markupPercent)||markupPercent<0||markupPercent>1000)return NextResponse.json({ok:false,error:"Invalid markup percent."},{status:400});
    if(!Number.isFinite(coinsPerUsd)||coinsPerUsd<1||coinsPerUsd>1000000)return NextResponse.json({ok:false,error:"Invalid coins per USD."},{status:400});
    if(!Number.isFinite(minTopupUsd)||minTopupUsd<0.01||!Number.isFinite(maxTopupUsd)||maxTopupUsd<minTopupUsd)return NextResponse.json({ok:false,error:"Invalid top-up limits."},{status:400});

    const rawPackages=Array.isArray(b.coinPackages)?b.coinPackages:[];
    const coinPackages=rawPackages.map((p:any)=>({
      coins:Math.floor(Number(p?.coins)),
      priceUsd:Number(p?.priceUsd),
      popular:Boolean(p?.popular)
    })).filter((p:any)=>Number.isFinite(p.coins)&&p.coins>0&&Number.isFinite(p.priceUsd)&&p.priceUsd>0).slice(0,8);

    if(!coinPackages.length)return NextResponse.json({ok:false,error:"Add at least one valid coin package."},{status:400});

    let popularUsed=false;
    for(const p of coinPackages){
      if(p.popular&&!popularUsed)popularUsed=true;
      else p.popular=false;
    }
    if(!popularUsed)coinPackages[0].popular=true;

    await (await collection<any>("settings")).replaceOne(
      {_id:"pricing"},
      {_id:"pricing",markupPercent,coinsPerUsd,minTopupUsd,maxTopupUsd,coinPackages,providerOperator,providerOperators,smsProvider,provider5simEnabled:smsProvider==="5sim"?true:currentSettings.provider5simEnabled,providerTigerEnabled:smsProvider==="tiger"?true:currentSettings.providerTigerEnabled,updatedAt:new Date()},
      {upsert:true}
    );
    return NextResponse.json({ok:true,settings:await getSettings()});
  }catch(e){
    return NextResponse.json({ok:false,error:e instanceof Error?e.message:"Settings update failed"},{status:500});
  }
}
