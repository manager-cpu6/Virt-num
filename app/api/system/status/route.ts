import {NextResponse} from "next/server";
import {collection} from "@/lib/mongo";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function GET(){
 try{
  const s=await (await collection<any>("settings")).findOne({_id:"systemMaintenance"});
  return NextResponse.json({ok:true,websiteEnabled:s?.websiteEnabled===true,appEnabled:s?.appEnabled===true,message:String(s?.message||"Numelixa is temporarily under maintenance. Please check back soon.")},{headers:{"Cache-Control":"no-store"}});
 }catch{
  return NextResponse.json({ok:true,websiteEnabled:false,appEnabled:false,message:"Numelixa is temporarily under maintenance."},{headers:{"Cache-Control":"no-store"}});
 }
}
