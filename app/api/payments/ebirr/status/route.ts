import {NextResponse} from "next/server";
import {collection} from "@/lib/mongo";
import {getSettings} from "@/lib/settings";
export const runtime="nodejs";export const dynamic="force-dynamic";
export async function GET(){
 try{
  const s=await (await collection<any>("settings")).findOne({_id:"payments"});
  return NextResponse.json({ok:true,open:s?.ebirrOpen===true,etbPerUsd:Number(s?.ebirrRateEtbPerUsd||0),receiver:String(s?.ebirrReceiver||""),instructions:String(s?.ebirrInstructions||"Pay the exact ETB amount to the official eBirr receiving number, then submit the transaction reference."),minTopupUsd:(await getSettings()).minTopupUsd,maxTopupUsd:(await getSettings()).maxTopupUsd},{headers:{"Cache-Control":"no-store"}});
 }catch{return NextResponse.json({ok:false,open:false},{status:500});}
}
