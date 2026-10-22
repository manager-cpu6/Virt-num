import {NextResponse} from "next/server";
import {requireAdmin} from "@/lib/auth";
import {collection} from "@/lib/mongo";
export const runtime="nodejs"; export const dynamic="force-dynamic";
export async function GET(){
 try{
  await requireAdmin();
  const s=await (await collection<any>("settings")).findOne({_id:"payments"});
  return NextResponse.json({ok:true,open:s?.sifaloLocalOpen===true,configured:Boolean(process.env.SIFALO_API_USER&&process.env.SIFALO_API_KEY),environment:String(process.env.SIFALO_ENV||"live")});
 }catch{return NextResponse.json({ok:false,error:"Unauthorized"},{status:401});}
}
export async function POST(req:Request){
 try{
  await requireAdmin();
  const body=await req.json();
  if(typeof body.open!=="boolean")return NextResponse.json({ok:false,error:"Choose Open or Closed."},{status:400});
  if(body.open&&(!process.env.SIFALO_API_USER||!process.env.SIFALO_API_KEY))return NextResponse.json({ok:false,error:"Add SIFALO_API_USER and SIFALO_API_KEY to the server environment before opening Local Payments."},{status:400});
  await (await collection<any>("settings")).updateOne({_id:"payments"},{$set:{sifaloLocalOpen:body.open,updatedAt:new Date()}},{upsert:true});
  return NextResponse.json({ok:true,open:body.open});
 }catch{return NextResponse.json({ok:false,error:"Unable to save Local Payments settings."},{status:500});}
}
