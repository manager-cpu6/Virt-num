import {NextResponse} from "next/server";
import {requireUser} from "@/lib/auth";
import {getPaymentSettings} from "@/lib/payment-settings";
import {getCoinNetworks,personalApiConfigured} from "@/lib/binance-personal";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function GET(){
 try{
  await requireUser();
  const settings=await getPaymentSettings();
  if(settings.activeProvider!=="binance"||!personalApiConfigured())return NextResponse.json({ok:false,error:"Binance payments are unavailable."},{status:503});
  const assets:{coin:string;name:string;logo:string;networks:any[]}[]=[];
  for(const coin of ["USDT","BNB"]){
   try{
    const networks=await getCoinNetworks(coin);
    if(networks.length)assets.push({coin,name:coin==="USDT"?"Tether USD":"BNB",logo:coin==="USDT"?"https://assets.coingecko.com/coins/images/325/large/Tether.png":"https://assets.coingecko.com/coins/images/825/large/bnb-icon2_2x.png",networks});
   }catch(error){console.error("[BINANCE ASSET NETWORKS]",coin,error instanceof Error?error.message:"unknown");}
  }
  if(!assets.length)return NextResponse.json({ok:false,error:"No supported Binance deposit assets are currently available."},{status:503});
  return NextResponse.json({ok:true,assets},{headers:{"Cache-Control":"no-store"}});
 }catch(e){
  if(e instanceof Error&&e.message==="AUTH_REQUIRED")return NextResponse.json({ok:false,error:"Please sign in."},{status:401});
  console.error("[BINANCE NETWORK LIST]",e instanceof Error?e.message:"unknown");
  return NextResponse.json({ok:false,error:"Unable to load available Binance assets and networks."},{status:502});
 }
}
