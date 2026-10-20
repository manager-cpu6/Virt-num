import {NextResponse} from "next/server";
import {requireUser} from "@/lib/auth";
import {getPaymentSettings} from "@/lib/payment-settings";
import {getAvailableDepositAssets,personalApiConfigured} from "@/lib/binance-personal";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function GET(){
 try{
  await requireUser();
  const settings=await getPaymentSettings();
  if(settings.activeProvider!=="binance"||!await personalApiConfigured())return NextResponse.json({ok:false,error:"Crypto payments are temporarily unavailable."},{status:503});
  const assets=await getAvailableDepositAssets();
  if(!assets.length)return NextResponse.json({ok:false,error:"No supported deposit assets are currently available."},{status:503});
  return NextResponse.json({ok:true,assets},{headers:{"Cache-Control":"no-store"}});
 }catch(e){
  if(e instanceof Error&&e.message==="AUTH_REQUIRED")return NextResponse.json({ok:false,error:"Please sign in."},{status:401});
  console.error("[BINANCE NETWORK LIST]",e instanceof Error?e.message:"unknown");
  return NextResponse.json({ok:false,error:"Unable to load supported assets and networks."},{status:502});
 }
}
