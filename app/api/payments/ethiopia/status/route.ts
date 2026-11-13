import {NextResponse} from "next/server";
import {requireUser} from "@/lib/auth";
import {collection} from "@/lib/mongo";
export const runtime="nodejs";export const dynamic="force-dynamic";
export async function GET(req:Request){
 try{const user=await requireUser(),url=new URL(req.url),orderId=url.searchParams.get("orderId")||"",order=await (await collection<any>("payments")).findOne({orderId,provider:"ebirr_manual",userId:String(user.id)});if(!order)return NextResponse.json({ok:false,error:"Order not found."},{status:404});return NextResponse.json({ok:true,status:order.status,credited:order.credited===true,verification:order.smsLastCheck||null,smsMatched:order.smsMatched===true},{headers:{"Cache-Control":"no-store"}});}catch(e){if(e instanceof Error&&e.message==="AUTH_REQUIRED")return NextResponse.json({ok:false,error:"Sign in required."},{status:401});return NextResponse.json({ok:false,error:"Unable to check payment status."},{status:500});}
}
