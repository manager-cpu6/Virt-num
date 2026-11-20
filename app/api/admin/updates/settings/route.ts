import {NextResponse} from "next/server";
import {requireAdmin} from "@/lib/auth";
import {collection} from "@/lib/mongo";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function GET(){
 try{
  await requireAdmin();
  const row=await (await collection<any>("settings")).findOne({_id:"updates"});
  return NextResponse.json({ok:true,settings:{enabled:row?.enabled===true,notificationsEnabled:row?.notificationsEnabled!==false,updatedAt:row?.updatedAt||null}},{headers:{"Cache-Control":"no-store"}});
 }catch(error){
  const message=error instanceof Error?error.message:"";
  const status=message==="AUTH_REQUIRED"||message==="ADMIN_REQUIRED"?401:500;
  return NextResponse.json({ok:false,error:status===401?"Unauthorized":"Unable to load Updates settings."},{status});
 }
}
export async function PATCH(req:Request){
 try{
  await requireAdmin();
  const body=await req.json().catch(()=>null);
  if(typeof body?.enabled!=="boolean")return NextResponse.json({ok:false,error:"The global enabled value must be boolean."},{status:400});
  const notificationsEnabled=typeof body.notificationsEnabled==="boolean"?body.notificationsEnabled:true;
  const now=new Date();
  await (await collection<any>("settings")).updateOne({_id:"updates"},{$set:{enabled:body.enabled,notificationsEnabled,updatedAt:now}},{upsert:true});
  return NextResponse.json({ok:true,settings:{enabled:body.enabled,notificationsEnabled,updatedAt:now}},{headers:{"Cache-Control":"no-store"}});
 }catch(error){
  const message=error instanceof Error?error.message:"";
  const status=message==="AUTH_REQUIRED"||message==="ADMIN_REQUIRED"?401:500;
  return NextResponse.json({ok:false,error:status===401?"Unauthorized":"Unable to save Updates settings."},{status});
 }
}
