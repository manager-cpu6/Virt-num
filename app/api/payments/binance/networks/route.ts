import {NextResponse} from "next/server";
import {requireUser} from "@/lib/auth";
import {getPaymentSettings} from "@/lib/payment-settings";
import {getUsdtNetworks,personalApiConfigured} from "@/lib/binance-personal";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function GET(){
 try{
  await requireUser();
  const settings=await getPaymentSettings();
  if(settings.activeProvider!=="binance"||!personalApiConfigured())return NextResponse.json({ok:false,error:"Binance payments are unavailable."},{status:503});
  return NextResponse.json({ok:true,currency:"USDT",networks:await getUsdtNetworks()});
 }catch(e){
  if(e instanceof Error&&e.message==="AUTH_REQUIRED")return NextResponse.json({ok:false,error:"Please sign in."},{status:401});
  console.error("[BINANCE NETWORK LIST]",e instanceof Error?e.message:"unknown");
  return NextResponse.json({ok:false,error:"Unable to load available USDT networks."},{status:502});
 }
}
