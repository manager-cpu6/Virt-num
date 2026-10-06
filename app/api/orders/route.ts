import {NextResponse,after} from "next/server";import {collection,mongoId} from "@/lib/mongo";import {requireUser} from "@/lib/auth";import {purchase,cancel,getPrice} from "@/lib/fivesim";import {getSettings,sellCoins} from "@/lib/settings";import {notifyUser} from "@/lib/notifications";import {watchOrderForPush} from "@/lib/order-watcher";
export const runtime="nodejs";export const dynamic="force-dynamic";export const maxDuration=300;
export async function POST(req:Request){
  let providerOrderId="",service="",country="",userId="",price=0;
  let walletDebited=false;

  try{
    const u=await requireUser();
    userId=String(u.id||"");

    const users=await collection<any>("users");
    const fresh=await users.findOne({_id:u.id});
    if(!fresh?.verifiedAt){
      return NextResponse.json(
        {ok:false,code:"EMAIL_VERIFICATION_REQUIRED",error:"Verify your email before buying a number."},
        {status:403}
      );
    }

    const b=await req.json();
    service=String(b.service||"").trim();
    country=String(b.countryCode||b.country||"").trim();
    if(!service||!country){
      return NextResponse.json({ok:false,error:"Service and country are required."},{status:400});
    }

    const settings=await getSettings();
    // Provider/operator selection is an internal Numelixa setting.
    // Never accept or expose an upstream operator choice through the public API.
    const operator=String(settings.providerOperator||"any").trim().toLowerCase()||"any";

    // Always obtain a fresh provider quote immediately before debiting.
    const quote=await getPrice(country,service,operator);
    if(!quote.count||!quote.cost){
      return NextResponse.json(
        {ok:false,error:operator==="any"
          ?"No availiable Numbers"
          :"No availiable Numbers"},
        {status:409}
      );
    }

    price=sellCoins(quote.cost,settings);

    const txs=await collection<any>("coinTransactions");
    const orders=await collection<any>("orders");
    const id=mongoId();

    // Debit the Numelixa wallet exactly once, before provider purchase.
    const updated=await users.findOneAndUpdate(
      {_id:u.id,coins:{$gte:price}},
      {$inc:{coins:-price}},
      {returnDocument:"after"}
    );
    if(!updated){
      return NextResponse.json(
        {ok:false,error:"Insufficient coins. Please top up your wallet."},
        {status:402}
      );
    }
    walletDebited=true;

    try{
      // IMPORTANT: purchase() is the only place that talks to 5SIM.
      // If 5SIM does not return an activation, no order is created.
      const p=await purchase(country,service,Number(quote.cost),operator);
      providerOrderId=String(p.order_id||"");
      const number=String(p.number||"");
      if(!providerOrderId||!number){
        throw new Error("Provider did not return a complete activation.");
      }

      const now=new Date();
      const expiresAt=p.expires_at
        ? new Date(p.expires_at)
        : new Date(now.getTime()+Number(p.expires_in||600)*1000);

      const orderDoc={
        _id:id,
        userId:u.id,
        providerOrderId,
        service,
        country,
        countryCode:country,
        phoneNumber:number,
        providerCostUsd:Number(p.providerCost||quote.cost),
        providerOperator:String(p.operator||operator),
        priceCoins:price,
        status:"waiting",
        code:null,
        fullSms:null,
        expiresAt,
        createdAt:now,
        cancelledAt:null,
        completedAt:null,
        refundCoins:0
      };

      // Provider purchase succeeded. Persist the actual activation BEFORE
      // treating the request as successful. Retry transient Mongo failures
      // and recover an already-inserted order by providerOrderId.
      let saved=false;
      let lastDbError:any=null;
      for(let attempt=1;attempt<=2&&!saved;attempt++){
        try{
          await orders.insertOne(orderDoc);
          saved=true;
        }catch(e){
          lastDbError=e;
          const existing=await orders.findOne({providerOrderId});
          if(existing){
            if(String(existing.userId)!==String(u.id)){
              throw new Error("PROVIDER_ORDER_CONFLICT");
            }
            saved=true;
          }else if(attempt<2){
            await new Promise(r=>setTimeout(r,250));
          }
        }
      }

      if(!saved){
        // The activation is real, but Numelixa could not persist it. Do not
        // silently report a normal purchase failure. Try to cancel; only
        // refund if cancellation is confirmed.
        let cancelled=false;
        try{
          await cancel(providerOrderId);
          cancelled=true;
        }catch{}

        if(cancelled){
          const refund=await users.findOneAndUpdate(
            {_id:u.id},
            {$inc:{coins:price}},
            {returnDocument:"after"}
          );
          try{
            await txs.insertOne({
              _id:mongoId(),userId:u.id,type:"refund",amount:price,
              balanceAfter:Number(refund?.coins||0),reference:id,
              description:"Refund after order persistence failure",createdAt:new Date()
            });
          }catch{}
          throw new Error("ORDER_SAVE_FAILED_REFUNDED");
        }

        console.error("[5SIM ORDER ORPHAN]",{
          providerOrderId,number,service,country,userId,
          dbError:lastDbError instanceof Error?lastDbError.message:String(lastDbError)
        });
        throw new Error("ORDER_SAVE_FAILED_ACTIVATION_ACTIVE:"+providerOrderId+":"+number);
      }

      // Push the purchase event immediately, then keep a short server-side
      // watcher alive after the response so an SMS can trigger a native push
      // without waiting for the 5-minute scheduled worker.
      try{

        await notifyUser(
          String(u.id),
          "📱 Number ready",
          "Your " + service + " number " + number + " is ready. Open Numelixa to get the verification code.",
          {orderId:id, type:"order"}
        );
      }catch(error){
        console.error("[ORDER PUSH]", error);
      }

      after(async()=>{await watchOrderForPush(id,String(u.id));});

      // The actual order is now durable. Ledger logging is secondary and
      // must never turn a successful provider purchase into a fake failure.
      try{
        await txs.insertOne({
          _id:mongoId(),
          userId:u.id,
          type:"debit",
          amount:-price,
          balanceAfter:Number(updated.coins||0),
          reference:id,
          description:"Number purchase: "+service+" / "+country,
          createdAt:now
        });
      }catch(e){
        console.error("[5SIM ORDER LEDGER]",{
          orderId:id,providerOrderId,userId,
          message:e instanceof Error?e.message:String(e)
        });
      }

      return NextResponse.json({
        ok:true,
        order:{
          id,
          number,
          price,
          expiresIn:Math.max(0,Math.floor((expiresAt.getTime()-Date.now())/1000)),
          stockAfter:Math.max(0,Number(quote.count)-1)
        }
      });
    }catch(e){
      // If no provider activation was created, refund the wallet debit.
      // If an activation exists, only refund after a confirmed provider
      // cancellation; otherwise the activation remains recoverable.
      if(providerOrderId){
        const existing=await orders.findOne({providerOrderId});
        if(existing&&String(existing.userId)===String(u.id)){
          return NextResponse.json({
            ok:true,
            order:{
              id:String(existing._id),
              number:String(existing.phoneNumber||""),
              price:Number(existing.priceCoins||price),
              expiresIn:Math.max(0,Math.floor((new Date(existing.expiresAt).getTime()-Date.now())/1000)),
              stockAfter:Math.max(0,Number(quote.count)-1)
            }
          });
        }
      }

      if(walletDebited){
        let cancelled=false;
        if(providerOrderId){
          try{await cancel(providerOrderId);cancelled=true}catch{}
        }

        if(cancelled||!providerOrderId){
          const refund=await users.findOneAndUpdate(
            {_id:u.id},
            {$inc:{coins:price}},
            {returnDocument:"after"}
          );
          try{
            await txs.insertOne({
              _id:mongoId(),
              userId:u.id,
              type:"refund",
              amount:price,
              balanceAfter:Number(refund?.coins||0),
              reference:"failed-"+providerOrderId+"-"+Date.now(),
              description:"Refund after failed number purchase",
              createdAt:new Date()
            });
          }catch{}
        }
      }

      throw e;
    }
  }catch(e){
    const m=e instanceof Error?e.message:"Order failed";
    console.error("[5SIM ORDER]",{message:m,service,country,userId,providerOrderId});

    if(m==="AUTH_REQUIRED")
      return NextResponse.json({ok:false,error:"Please sign in to continue."},{status:401});
    if(m==="EMAIL_VERIFICATION_REQUIRED")
      return NextResponse.json({ok:false,code:"EMAIL_VERIFICATION_REQUIRED",error:m},{status:403});
    if(m==="PROVIDER_BALANCE_TOO_LOW")
      return NextResponse.json({ok:false,error:"The selected number is temporarily unavailable. Please try again."},{status:503});
    if(m==="PRICE_CHANGED")
      return NextResponse.json({ok:false,error:"The number price changed before purchase. Your coins were not charged. Please refresh and try again."},{status:409});
    if(m==="NO_FREE_PHONES"||/no free phones/i.test(m))
      return NextResponse.json({ok:false,error:"No availiable Numbers"},{status:409});
    if(/not enough user balance/i.test(m))
      return NextResponse.json({ok:false,error:"The selected number is temporarily unavailable. Please try again."},{status:503});
    if(/not enough rating/i.test(m))
      return NextResponse.json({ok:false,error:"The selected number is temporarily unavailable. Please try another service or country."},{status:503});
    if(m==="INVALID_COUNTRY"||/bad country|country is incorrect/i.test(m))
      return NextResponse.json({ok:false,code:"INVALID_COUNTRY",error:"Country is not supported. Use a country code listed by Numelixa."},{status:400});
    if(m==="INVALID_SERVICE")
      return NextResponse.json({ok:false,code:"INVALID_SERVICE",error:"Service is not supported. Use a service ID listed by Numelixa."},{status:400});
    if(/bad operator/i.test(m))
      return NextResponse.json({ok:false,code:"INVALID_OPERATOR",error:"Operator is not available for this service and country."},{status:400});
    if(/no product/i.test(m))
      return NextResponse.json({ok:false,error:"No availiable Numbers"},{status:409});
    if(/server offline/i.test(m))
      return NextResponse.json({ok:false,error:"The number service is temporarily unavailable. Please try again shortly."},{status:503});
    if(/HTTP 401|HTTP 403|unauthorized|invalid token|invalid api/i.test(m))
      return NextResponse.json({ok:false,error:"The number service is temporarily unavailable. Please try again shortly."},{status:503});
    if(m==="ORDER_SAVE_FAILED_REFUNDED")
      return NextResponse.json({ok:false,error:"The number service could not be saved, so your coins were refunded. Please try again."},{status:502});
    if(m.startsWith("ORDER_SAVE_FAILED_ACTIVATION_ACTIVE:")){
      const parts=m.split(":");
      return NextResponse.json({
        ok:false,
        code:"ACTIVATION_RECOVERY_REQUIRED",
        error:"A number was issued but could not be saved safely. Do not buy another number. Contact Numelixa support with recovery ID "+(parts[1]||"unknown")+"."
      },{status:503});
    }
    if(m==="PROVIDER_ORDER_CONFLICT")
      return NextResponse.json({ok:false,error:"The provider activation could not be safely attached to this account. Please contact support."},{status:409});

    return NextResponse.json({ok:false,error:"Number purchase failed. Your wallet is protected; please try again."},{status:502});
  }
}
export async function DELETE(req:Request){try{
 const u=await requireUser(),b=await req.json(),id=String(b.orderId||""),orders=await collection<any>("orders"),users=await collection<any>("users"),txs=await collection<any>("coinTransactions"),o=await orders.findOne({_id:id,userId:u.id});
 if(!o)return NextResponse.json({ok:false,error:"Order not found."},{status:404});if(o.status!=="waiting")return NextResponse.json({ok:false,error:"This order can no longer be cancelled."},{status:409});
 const age=Date.now()-new Date(o.createdAt).getTime();if(age>5*60*1000)return NextResponse.json({ok:false,error:"Cancel is available only during the first 5 minutes."},{status:409});
 await cancel(String(o.providerOrderId));const changed=await orders.findOneAndUpdate({_id:id,userId:u.id,status:"waiting"},{$set:{status:"cancelled",cancelledAt:new Date(),refundCoins:Number(o.priceCoins||0)}},{returnDocument:"after"});if(!changed)return NextResponse.json({ok:false,error:"Order status changed while cancelling."},{status:409});
 const refund=Number(o.priceCoins||0),updated=await users.findOneAndUpdate({_id:u.id},{$inc:{coins:refund}},{returnDocument:"after"});await txs.insertOne({_id:mongoId(),userId:u.id,type:"refund",amount:refund,balanceAfter:Number(updated?.coins||0),reference:id,description:"Cancelled number refund",createdAt:new Date()});return NextResponse.json({ok:true,refundedCoins:refund});
}catch{return NextResponse.json({ok:false,error:"Cancellation failed. Please try again."},{status:500})}}