import {NextResponse} from "next/server";
import {requireUser} from "@/lib/auth";
import {collection} from "@/lib/mongo";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function GET(){
 try{
  const user=await requireUser();
  const settings=await (await collection<any>("settings")).findOne({_id:"updates"});
  const row=await (await collection<any>("users")).findOne({_id:String(user.id)},{projection:{updatesPreferences:1}});
  const p=row?.updatesPreferences||{};
  return NextResponse.json({ok:true,enabled:settings?.enabled===true,hideUpdates:p.hideUpdates===true,notificationsEnabled:p.notificationsEnabled!==false},{headers:{"Cache-Control":"no-store"}});
 }catch(error){
  const message=error instanceof Error?error.message:"";
  return NextResponse.json({ok:false,error:message==="AUTH_REQUIRED"?"Please sign in again.":"Unable to load Updates preferences."},{status:message==="AUTH_REQUIRED"?401:500});
 }
}
export async function PATCH(req:Request){
 try{
  const user=await requireUser();
  const body=await req.json().catch(()=>null);
  if(typeof body?.hideUpdates!=="boolean"&&typeof body?.notificationsEnabled!=="boolean")
   return NextResponse.json({ok:false,error:"No valid preference was supplied."},{status:400});
  const patch:Record<string,unknown>={};
  if(typeof body.hideUpdates==="boolean")patch["updatesPreferences.hideUpdates"]=body.hideUpdates;
  if(typeof body.notificationsEnabled==="boolean")patch["updatesPreferences.notificationsEnabled"]=body.notificationsEnabled;
  patch["updatesPreferences.updatedAt"]=new Date();
  await (await collection<any>("users")).updateOne({_id:String(user.id)},{$set:patch});
  const row=await (await collection<any>("users")).findOne({_id:String(user.id)},{projection:{updatesPreferences:1}});
  const p=row?.updatesPreferences||{};
  const settings=await (await collection<any>("settings")).findOne({_id:"updates"});
  return NextResponse.json({ok:true,enabled:settings?.enabled===true,hideUpdates:p.hideUpdates===true,notificationsEnabled:p.notificationsEnabled!==false},{headers:{"Cache-Control":"no-store"}});
 }catch(error){
  const message=error instanceof Error?error.message:"";
  return NextResponse.json({ok:false,error:message==="AUTH_REQUIRED"?"Please sign in again.":"Unable to save Updates preferences."},{status:message==="AUTH_REQUIRED"?401:500});
 }
}
