import {NextResponse} from "next/server";
import {getUser} from "@/lib/auth";
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
  const u=await getUser();
  const settings=await getSettings().catch(()=>null);
  return NextResponse.json({
    ok:true,
    name:"Numelixa Developer API",
    version:"v1",
    status:"operational",
    authenticated:Boolean(u),
    authentication:"Bearer nx_live_* or x-api-key",
    currency:"coins",
    coinsPerUsd:Number(settings?.coinsPerUsd||100),
    endpoints:{
      account:"GET /api/v1/account",
      balance:"GET /api/v1/balance",
      services:"GET /api/v1/services",
      countries:"GET /api/v1/countries?service=whatsapp",
      stock:"GET /api/v1/stock?country=us&service=whatsapp",
      orders:"GET|POST /api/v1/orders",
      code:"POST /api/v1/orders/code",
      cancel:"POST /api/v1/orders/cancel",
      transactions:"GET /api/v1/transactions"
    }
  },{headers});
}