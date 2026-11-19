import {NextResponse} from "next/server";
import {requireUser} from "@/lib/auth";
import {collection} from "@/lib/mongo";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function GET(){
 try{
  const user=await requireUser();
  const row=await (await collection<any>("users")).findOne({_id:String(user.id)},{projection:{notificationPreferences:1}});
  const p=row?.notificationPreferences||{};
  return NextResponse.json({ok:true,preferences:{appEnabled:p.appEnabled!==false,emailEnabled:p.emailEnabled===true}},{headers:{"Cache-Control":"no-store"}});
 }catch(error){
  const message=error instanceof Error?error.message:"";
  const status=message==="AUTH_REQUIRED"?401:500;
  return NextResponse.json({ok:false,error:status===401?"Please sign in again.":"Unable to load notification preferences."},{status});
 }
}
export async function PATCH(req:Request){
 try{
  const user=await requireUser();
  const body=await req.json().catch(()=>null);
  if(typeof body?.appEnabled!=="boolean"||typeof body?.emailEnabled!=="boolean")
   return NextResponse.json({ok:false,error:"Choose both notification preferences."},{status:400});
  const preferences={appEnabled:body.appEnabled,emailEnabled:body.emailEnabled,updatedAt:new Date()};
  await (await collection<any>("users")).updateOne({_id:String(user.id)},{$set:{notificationPreferences:preferences}});
  return NextResponse.json({ok:true,preferences:{appEnabled:preferences.appEnabled,emailEnabled:preferences.emailEnabled}});
 }catch(error){
  const message=error instanceof Error?error.message:"";
  const status=message==="AUTH_REQUIRED"?401:500;
  return NextResponse.json({ok:false,error:status===401?"Please sign in again.":"Unable to save notification preferences."},{status});
 }
}
