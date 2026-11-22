import {NextResponse} from "next/server";
import {tokenHash} from "@/lib/auth";
import {collection} from "@/lib/mongo";
export const runtime="nodejs";export const dynamic="force-dynamic";
export async function GET(req:Request){
 try{const url=new URL(req.url),orderId=url.searchParams.get("orderId")||"",token=String(req.headers.get("x-ethiopia-checkout-token")||"");if(!/^[A-Za-z0-9_-]{40,}$/.test(token))return NextResponse.json({ok:false,error:"Invalid checkout access."},{status:401});const order=await (await collection<any>("payments")).findOne({orderId,provider:"ebirr_manual",checkoutTokenHash:tokenHash(token)});if(!order)return NextResponse.json({ok:false,error:"Order not found."},{status:404});return NextResponse.json({ok:true,status:order.status,credited:order.credited===true,verification:order.smsLastCheck||null,smsMatched:order.smsMatched===true},{headers:{"Cache-Control":"no-store"}});}catch(e){return NextResponse.json({ok:false,error:"Unable to check payment status."},{status:500});}
}
