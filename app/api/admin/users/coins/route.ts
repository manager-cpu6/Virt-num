import {NextResponse} from "next/server";
import {requireAdmin} from "@/lib/auth";
import {collection,mongoId} from "@/lib/mongo";
import {notifyUser} from "@/lib/notifications";

export const runtime="nodejs";
export const dynamic="force-dynamic";

export async function POST(req:Request){
  try{
    await requireAdmin();
    const b=await req.json();
    const userId=String(b.userId||"");
    const mode=String(b.mode||"add");
    const amount=Number(b.amount);

    if(!userId||!["add","remove","set"].includes(mode)||!Number.isFinite(amount)||amount<0){
      return NextResponse.json({ok:false,error:"Invalid adjustment."},{status:400});
    }

    const users=await collection<any>("users");
    const u=await users.findOne({_id:userId});
    if(!u)return NextResponse.json({ok:false,error:"User not found."},{status:404});

    const current=Number(u.coins||0);
    const next=mode==="add"?current+amount:mode==="remove"?Math.max(0,current-amount):amount;
    const delta=next-current;

    await users.updateOne({_id:userId},{$set:{coins:next,updatedAt:new Date()}});
    await (await collection<any>("coinTransactions")).insertOne({
      _id:mongoId(),
      userId,
      type:"admin_adjustment",
      amount:delta,
      balanceAfter:next,
      createdAt:new Date()
    });

    if(delta>0){
      try{
        await notifyUser(
          userId,
          "🪙 Coins added",
          "Admin added "+delta.toLocaleString()+" coins to your Numelixa wallet.",
          {type:"coins",amount:String(delta),balance:String(next)}
        );
      }catch(error){
        console.error("[ADMIN COINS PUSH]",error);
      }
    }else if(delta<0){
      try{
        await notifyUser(
          userId,
          "🪙 Wallet updated",
          Math.abs(delta).toLocaleString()+" coins were removed from your Numelixa wallet.",
          {type:"coins",amount:String(delta),balance:String(next)}
        );
      }catch(error){
        console.error("[ADMIN COINS PUSH]",error);
      }
    }

    return NextResponse.json({ok:true,coins:next});
  }catch(e){
    return NextResponse.json({ok:false,error:"Unauthorized"},{status:401});
  }
}
