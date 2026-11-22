import {NextResponse} from "next/server";
import {requireUser} from "@/lib/auth";
import {collection} from "@/lib/mongo";
export const runtime="nodejs";export const dynamic="force-dynamic";
export async function GET(req:Request){try{const user=await requireUser(),id=new URL(req.url).searchParams.get("orderId")||"";const p=await (await collection<any>("payments")).findOne({orderId:id,provider:"sifalo",method:"card",userId:String(user.id)});if(!p)return NextResponse.json({ok:false,error:"Payment order not found."},{status:404});return NextResponse.json({ok:true,status:String(p.status||"pending"),amountUsd:Number(p.amountUsd||0),orderId:p.orderId},{headers:{"Cache-Control":"no-store"}});}catch(e){return NextResponse.json({ok:false,error:e instanceof Error&&e.message==="AUTH_REQUIRED"?"Sign in to view this payment.":"Unable to load payment status."},{status:401});}}
