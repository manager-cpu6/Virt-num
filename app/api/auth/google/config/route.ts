import {NextResponse} from "next/server";

export const runtime="nodejs";
export const dynamic="force-dynamic";

export async function GET(){
 const clientId=String(process.env.GOOGLE_CLIENT_ID||"").trim();
 if(!clientId)return NextResponse.json({ok:false,error:"Google sign-in is not configured."},{status:503,headers:{"Cache-Control":"no-store"}});
 return NextResponse.json({ok:true,clientId},{headers:{"Cache-Control":"no-store"}});
}
