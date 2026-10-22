import {NextResponse} from "next/server";
import {collection} from "@/lib/mongo";
export const runtime="nodejs"; export const dynamic="force-dynamic";
export async function GET(){
 try{
  const s=await (await collection<any>("settings")).findOne({_id:"payments"});
  const configured=Boolean(process.env.SIFALO_API_USER&&process.env.SIFALO_API_KEY);
  return NextResponse.json({ok:true,open:s?.sifaloLocalOpen===true,configured,methods:["Waafi","EVC Plus","ZAAD","SAHAL","eDahab","Premier Wallet"],directCardSupported:false},{headers:{"Cache-Control":"no-store, max-age=0"}});
 }catch{return NextResponse.json({ok:false,open:false,configured:false},{status:500});}
}
