import crypto from "crypto";
import {collection,getMongoClient,mongoId} from "@/lib/mongo";
export async function ensureReferralCode(userId:string){
 const users=await collection<any>("users"),current=await users.findOne({_id:userId},{projection:{referralCode:1}});
 if(current?.referralCode)return String(current.referralCode);
 for(let i=0;i<5;i++){const code=crypto.randomBytes(5).toString("hex").toUpperCase();try{await users.updateOne({_id:userId,referralCode:{$exists:false}},{$set:{referralCode:code}});const saved=await users.findOne({_id:userId},{projection:{referralCode:1}});if(saved?.referralCode)return String(saved.referralCode)}catch(e){if(i===4)throw e}}
 throw new Error("Unable to create referral code");
}
export async function applyReferralReward(input:{userId:string;paymentReference:string;amountUsd:number;description?:string}){
 const amount=Number(input.amountUsd),reference=String(input.paymentReference||"").trim();if(!input.userId||!reference||!Number.isFinite(amount)||amount<=0)return {credited:false};
 const users=await collection<any>("users"),invitee=await users.findOne({_id:String(input.userId)},{projection:{referredBy:1}}),referrerId=String(invitee?.referredBy||"");
 if(!referrerId||referrerId===String(input.userId))return {credited:false};
 const settings=await collection<any>("settings").then(c=>c.findOne({_id:"referrals"}));if(settings?.enabled!==true)return {credited:false};
 const percent=Math.min(50,Math.max(0,Number(settings.commissionPercent)||0)),cents=Math.floor(amount*100*percent/100);if(cents<1)return {credited:false};
 const session=getMongoClient().startSession();
 try{let applied=false;await session.withTransaction(async()=>{await collection<any>("referralRewards").then(c=>c.insertOne({_id:mongoId(),paymentReference:reference,inviteeId:String(input.userId),referrerId,amountUsd:cents/100,commissionPercent:percent,status:"available",description:String(input.description||"Verified wallet payment").slice(0,120),createdAt:new Date()},{session}));const u=await users.updateOne({_id:referrerId},{$inc:{referralBalanceCents:cents},$set:{referralUpdatedAt:new Date()}},{session});if(!u.matchedCount)throw new Error("Referral owner missing");applied=true});return {credited:applied,amountUsd:cents/100}}catch(e){if((e as any)?.code===11000)return {credited:false,duplicate:true};throw e}finally{await session.endSession()}
}
