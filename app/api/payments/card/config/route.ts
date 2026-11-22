import {NextResponse} from "next/server";
import {collection} from "@/lib/mongo";
export const runtime="nodejs";export const dynamic="force-dynamic";
export async function GET(){try{const s=await (await collection<any>("settings")).findOne({_id:"payments"});return NextResponse.json({ok:true,open:s?.cardPaymentOpen===true&&s?.cardSurchargeApproved===true,surchargePercent:Number(s?.cardSurchargePercent??40),configured:Boolean(process.env.SIFALO_API_USER&&process.env.SIFALO_API_KEY)},{headers:{"Cache-Control":"no-store, max-age=0"}});}catch{return NextResponse.json({ok:false,open:false,surchargePercent:40,configured:false},{status:500});}}
