import {NextResponse} from "next/server";
import {collection} from "@/lib/mongo";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function GET(req:Request){
  try{
    const code=(new URL(req.url).searchParams.get("code")||"").trim().toUpperCase();
    if(!/^NX-[A-F0-9]{16}$/.test(code))return NextResponse.json({ok:false,valid:false,error:"Enter a valid Numelixa receipt code."},{status:400});
    const order=await (await collection<any>("payments")).findOne({receiptId:code,provider:"ebirr_manual",status:"paid",credited:true},{projection:{receiptId:1,methodName:1,method:1,amountUsd:1,amountEtb:1,paidAt:1,smsMatchedAt:1,transactionReference:1}});
    if(!order)return NextResponse.json({ok:true,valid:false,receiptId:code},{headers:{"Cache-Control":"no-store"}});
    const paidAt=order.paidAt||order.smsMatchedAt||null;
    const reference=String(order.transactionReference||"");
    return NextResponse.json({ok:true,valid:true,receipt:{receiptId:code,service:String(order.methodName||order.method||"Ethiopia Local Payment"),amountUsd:Number(order.amountUsd||0),amountEtb:Number(order.amountEtb||0),paidAt:paidAt?new Date(paidAt).toISOString():null,referenceSuffix:reference?reference.slice(-6):""}},{headers:{"Cache-Control":"no-store"}});
  }catch(error){console.error("[PUBLIC RECEIPT VERIFY]",error);return NextResponse.json({ok:false,valid:false,error:"Unable to verify this receipt right now."},{status:500});}
}
