import {NextResponse} from "next/server";
import {requireUser} from "@/lib/auth";
import {collection} from "@/lib/mongo";
import {getSettings} from "@/lib/settings";

export const runtime="nodejs";
export const dynamic="force-dynamic";

const headers={
  "Cache-Control":"no-store",
  "Access-Control-Allow-Origin":"*",
  "Access-Control-Allow-Methods":"GET,OPTIONS",
  "Access-Control-Allow-Headers":"Authorization,Content-Type,X-API-Key",
};

export async function OPTIONS(){
  return new NextResponse(null,{status:204,headers});
}

export async function GET(){
  try{
    const u=await requireUser();
    const user=await (await collection<any>("users")).findOne({_id:u.id});
    const pricing=await getSettings();
    if(!user)return NextResponse.json({ok:false,error:"Account not found."},{status:404,headers});
    return NextResponse.json({
      ok:true,
      balance:Number(((Number(user.coins)||0)/(Number(pricing.coinsPerUsd)||100)).toFixed(2)),
      currency:"USD",
      accountId:String(user._id)
    },{headers});
  }catch(e){
    if(e instanceof Error&&e.message==="AUTH_REQUIRED"){
      return NextResponse.json({ok:false,error:"Invalid or missing API key."},{status:401,headers});
    }
    console.error("[API BALANCE]",e);
    return NextResponse.json({ok:false,error:"Unable to load balance."},{status:500,headers});
  }
}