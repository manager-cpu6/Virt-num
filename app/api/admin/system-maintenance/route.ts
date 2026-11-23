import {NextResponse} from "next/server";
import {requireAdmin} from "@/lib/auth";
import {collection,mongoId} from "@/lib/mongo";

export const runtime="nodejs";
export const dynamic="force-dynamic";

export async function GET(){
 try{
  await requireAdmin();
  const s=await (await collection<any>("settings")).findOne({_id:"systemMaintenance"});
  return NextResponse.json({ok:true,settings:{websiteEnabled:s?.websiteEnabled===true,appEnabled:s?.appEnabled===true,message:String(s?.message||"Numelixa is temporarily under maintenance. Please check back soon."),stopNewUsers:s?.stopNewUsers===true,stopDeposit:s?.stopDeposit===true,stopOrders:s?.stopOrders===true,updatedAt:s?.updatedAt||null,updatedBy:s?.updatedBy||null}},{headers:{"Cache-Control":"no-store"}});
 }catch(error){
  const message=error instanceof Error?error.message:"";
  const status=message==="AUTH_REQUIRED"||message==="ADMIN_REQUIRED"?401:500;
  return NextResponse.json({ok:false,error:status===401?"Unauthorized":"Unable to load maintenance settings."},{status});
 }
}

export async function POST(req:Request){
 try{
  const admin=await requireAdmin();
  const body=await req.json().catch(()=>null);
  if(!body||typeof body!=="object"||typeof body.websiteEnabled!=="boolean"||typeof body.appEnabled!=="boolean")
   return NextResponse.json({ok:false,error:"Choose the website and app maintenance states."},{status:400});
  const previous=await (await collection<any>("settings")).findOne({_id:"systemMaintenance"});
  const stopNewUsers=typeof body.stopNewUsers==="boolean"?body.stopNewUsers:previous?.stopNewUsers===true;
  const stopDeposit=typeof body.stopDeposit==="boolean"?body.stopDeposit:previous?.stopDeposit===true;
  const stopOrders=typeof body.stopOrders==="boolean"?body.stopOrders:previous?.stopOrders===true;
  const message=String(body.message||"").trim().slice(0,240)||"Numelixa is temporarily under maintenance. Please check back soon.";
  const now=new Date();
  const settings={_id:"systemMaintenance",websiteEnabled:body.websiteEnabled,appEnabled:body.appEnabled,stopNewUsers,stopDeposit,stopOrders,message,updatedAt:now,updatedBy:String(admin.id)};
  await (await collection<any>("settings")).replaceOne({_id:"systemMaintenance"},settings,{upsert:true});
  await (await collection<any>("auditLogs")).insertOne({_id:mongoId(),actorId:String(admin.id),action:"system.maintenance.update",metadata:JSON.stringify({websiteEnabled:body.websiteEnabled,appEnabled:body.appEnabled,stopNewUsers,stopDeposit,stopOrders}),createdAt:now});
  return NextResponse.json({ok:true,settings});
 }catch(error){
  const message=error instanceof Error?error.message:"";
  const status=message==="AUTH_REQUIRED"||message==="ADMIN_REQUIRED"?401:500;
  return NextResponse.json({ok:false,error:status===401?"Unauthorized":"Unable to save maintenance settings."},{status});
 }
}
