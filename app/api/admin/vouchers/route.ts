import {NextResponse} from "next/server";
import crypto from "crypto";
import {requireAdmin} from "@/lib/auth";
import {collection,mongoId} from "@/lib/mongo";

export const runtime="nodejs";
export const dynamic="force-dynamic";

export async function GET(){
 try{
  await requireAdmin();
  const rows=await (await collection<any>("vouchers")).find({}).sort({createdAt:-1}).limit(200).toArray();
  return NextResponse.json({ok:true,vouchers:rows.map(x=>({id:String(x._id),code:x.code,amountUsd:Number(x.amountUsd||0),status:x.status,redemptions:Number(x.redemptions||0),maxRedemptions:Number(x.maxRedemptions||1),expiresAt:x.expiresAt,createdAt:x.createdAt}))},{headers:{"Cache-Control":"no-store"}});
 }catch{return NextResponse.json({ok:false,error:"Admin access required."},{status:401})}
}
export async function POST(req:Request){
 try{
  await requireAdmin();
  const b=await req.json().catch(()=>({})),amountUsd=Number(b.amountUsd),maxRedemptions=Math.floor(Number(b.maxRedemptions||1));
  if(!Number.isFinite(amountUsd)||amountUsd<=0||amountUsd>100000||!Number.isInteger(maxRedemptions)||maxRedemptions<1||maxRedemptions>100000)return NextResponse.json({ok:false,error:"Enter a valid voucher amount and redemption limit."},{status:400});
  const supplied=String(b.code||"").trim().toUpperCase().replace(/\s+/g,"");
  const code=supplied||("NX-"+crypto.randomBytes(6).toString("hex").toUpperCase());
  if(!/^[A-Z0-9-]{6,48}$/.test(code))return NextResponse.json({ok:false,error:"Voucher codes must contain 6–48 letters, numbers or hyphens."},{status:400});
  const expiresAt=b.expiresAt?new Date(String(b.expiresAt)):new Date(Date.now()+365*24*60*60*1000);
  if(!Number.isFinite(expiresAt.getTime())||expiresAt<=new Date())return NextResponse.json({ok:false,error:"Expiry must be a future date."},{status:400});
  const vouchers=await collection<any>("vouchers");
  if(await vouchers.findOne({code}))return NextResponse.json({ok:false,error:"That voucher code already exists."},{status:409});
  const row={_id:mongoId(),code,amountUsd:Number(amountUsd.toFixed(2)),status:"active",redemptions:0,maxRedemptions,redeemedBy:[],expiresAt,createdAt:new Date()};
  await vouchers.insertOne(row);
  return NextResponse.json({ok:true,voucher:{id:String(row._id),code,amountUsd:row.amountUsd,status:row.status,maxRedemptions,expiresAt}});
 }catch{return NextResponse.json({ok:false,error:"Unable to create voucher."},{status:500})}
}
