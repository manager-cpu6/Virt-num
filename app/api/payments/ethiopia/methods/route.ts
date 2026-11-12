import {NextResponse} from "next/server";
import {collection} from "@/lib/mongo";
import {getSettings} from "@/lib/settings";
export const runtime="nodejs";export const dynamic="force-dynamic";
const names:Record<string,string>={coopay_ebirr:"Coopay eBirr",kaafi_ebirr:"Kaafi eBirr",cbe_birr:"CBE Birr",cbe_bank:"CBE Bank Transfer",mpesa:"M-Pesa",telebirr:"Telebirr"};
export async function GET(){try{const s=await (await collection<any>("settings")).findOne({_id:"payments"}),saved=s?.ethiopiaPaymentMethods||{},methods:Record<string,any>={};for(const [id,name] of Object.entries(names)){const x=saved[id]||{},legacy=s?.ebirrOpen===true&&id==="coopay_ebirr";methods[id]={name,open:typeof x.open==="boolean"?x.open:legacy,receiver:String(x.receiver??(id==="coopay_ebirr"?String(s?.ebirrReceiver||""):"")),instructions:String(x.instructions??s?.ebirrInstructions??"")};}return NextResponse.json({ok:true,methods,etbPerUsd:Number(s?.ebirrRateEtbPerUsd||0),minTopupUsd:(await getSettings()).minTopupUsd,maxTopupUsd:(await getSettings()).maxTopupUsd},{headers:{"Cache-Control":"no-store"}});}catch{return NextResponse.json({ok:false,methods:{}},{status:500});}}
