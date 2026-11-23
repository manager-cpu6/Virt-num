import {NextResponse} from "next/server";
import {requireAdmin} from "@/lib/auth";
import {collection} from "@/lib/mongo";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function GET(req:Request){
 try{
  await requireAdmin();
  const target=(new URL(req.url).searchParams.get("q")||"").trim();
  if(!target||target.length>180)return NextResponse.json({ok:false,error:"Enter a user ID, Numelixa ID or email."},{status:400});
  const user=await (await collection<any>("users")).findOne({$or:[{_id:target},{publicId:target},{email:target.toLowerCase()}]},{projection:{password_hash:0,googleId:0,resetToken:0,privateNotes:0}});
  if(!user)return NextResponse.json({ok:false,error:"No user matched that ID or email."},{status:404});
  const id=String(user._id);
  const [sessions,payments,transactions,orders,approvals]=await Promise.all([
   (await collection<any>("sessions")).find({userId:id},{projection:{tokenHash:0}}).sort({lastSeenAt:-1}).limit(50).toArray(),
   (await collection<any>("payments")).find({userId:id}).sort({createdAt:-1}).limit(50).toArray(),
   (await collection<any>("coinTransactions")).find({userId:id}).sort({createdAt:-1}).limit(100).toArray(),
   (await collection<any>("orders")).find({userId:id}).sort({createdAt:-1}).limit(50).toArray(),
   (await collection<any>("loginApprovals")).find({userId:id}).sort({createdAt:-1}).limit(30).toArray()
  ]);
  const date=(v:any)=>v?new Date(v).toISOString():null;
  return NextResponse.json({ok:true,user:{id,publicId:String(user.publicId||""),name:String(user.name||""),email:String(user.email||""),phone:String(user.phone||""),role:String(user.role||"user"),coins:Number(user.coins||0),createdAt:date(user.createdAt),verifiedAt:date(user.verifiedAt),phoneVerifiedAt:date(user.phoneVerifiedAt),suspendedAt:date(user.suspendedAt),lastLoginAt:date(user.lastLoginAt),lastLoginIp:String(user.lastLoginIp||""),lastLoginDevice:String(user.lastLoginDevice||""),lastLoginPlatform:String(user.lastLoginPlatform||""),lastLoginBrowser:String(user.lastLoginBrowser||"")},
   sessions:sessions.map((s:any)=>({createdAt:date(s.createdAt),lastSeenAt:date(s.lastSeenAt),expiresAt:date(s.expiresAt),ip:String(s.ip||""),city:String(s.city||""),region:String(s.region||""),country:String(s.country||""),device:String(s.device||""),browser:String(s.browser||""),platform:String(s.platform||"")})),
   payments:payments.map((p:any)=>({id:String(p._id),provider:String(p.provider||""),method:String(p.method||p.methodName||""),amountUsd:Number(p.amountUsd||0),status:String(p.status||""),reference:String(p.orderId||p.providerId||p.txid||""),createdAt:date(p.createdAt),paidAt:date(p.paidAt)})),
   transactions:transactions.map((t:any)=>({id:String(t._id),type:String(t.type||""),amount:Number(t.amount||0),balanceAfter:Number(t.balanceAfter||0),reference:String(t.reference||""),description:String(t.description||""),createdAt:date(t.createdAt)})),
   orders:orders.map((o:any)=>({id:String(o._id),service:String(o.service||""),country:String(o.country||""),phoneNumber:String(o.phoneNumber||""),status:String(o.status||""),priceCoins:Number(o.priceCoins||0),createdAt:date(o.createdAt)})),
   loginApprovals:approvals.map((a:any)=>({status:String(a.status||""),createdAt:date(a.createdAt),ip:String(a.ip||""),city:String(a.city||""),region:String(a.region||""),country:String(a.country||""),device:String(a.device||""),browser:String(a.browser||""),platform:String(a.platform||"")}))
  },{headers:{"Cache-Control":"no-store"}});
 }catch(e){const m=e instanceof Error?e.message:"";const status=m==="AUTH_REQUIRED"||m==="ADMIN_REQUIRED"?401:500;return NextResponse.json({ok:false,error:status===401?"Unauthorized":"Unable to load user records."},{status});}
}
