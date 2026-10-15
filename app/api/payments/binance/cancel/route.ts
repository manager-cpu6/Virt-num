import {NextResponse} from "next/server";
import {requireUser} from "@/lib/auth";
import {collection} from "@/lib/mongo";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function POST(req:Request){
 try{
  const user=await requireUser();
  const body=await req.json().catch(()=>({}));
  const orderId=String(body.orderId||"").trim();
  if(!orderId)return NextResponse.json({ok:false,error:"Payment order is required."},{status:400});
  const result=await (await collection<any>("payments")).updateOne(
   {orderId,provider:"binance_personal",userId:String(user.id),status:"pending",expiresAt:{$gt:new Date()}},
   {$set:{status:"cancelled",cancelledAt:new Date(),updatedAt:new Date(),cancelReason:"user_cancelled"}}
  );
  return NextResponse.json({ok:true,cancelled:result.modifiedCount===1},{headers:{"Cache-Control":"no-store"}});
 }catch(e){
  if(e instanceof Error&&e.message==="AUTH_REQUIRED")return NextResponse.json({ok:false,error:"Please sign in."},{status:401});
  return NextResponse.json({ok:false,error:"Unable to cancel payment."},{status:500});
 }
}
