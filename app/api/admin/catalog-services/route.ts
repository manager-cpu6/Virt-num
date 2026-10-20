import {NextResponse} from "next/server";
import {requireAdmin} from "@/lib/auth";
import {collection} from "@/lib/mongo";
import {listServices,listCountries,servicePrices} from "@/lib/sms-provider";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export const maxDuration=60;
const normalize=(v:unknown)=>String(v??"").trim().toLowerCase().replace(/[^a-z0-9]/g,"");
export async function GET(){
 try{
  await requireAdmin();
  const settings=await collection<any>("settings");
  const catalog=await settings.findOne({_id:"serviceCatalog"});
  const hidden:string[]=Array.isArray(catalog?.hiddenServices)?catalog.hiddenServices:[];
  const services=await listServices();
  return NextResponse.json({ok:true,hiddenServices:hidden,services:services.map((s:any)=>({id:String(s.id??s.code??s.name??s.title??""),name:String(s.name??s.title??s.id??s.code??"")})).filter((s:any)=>s.id)});
 }catch(e){return NextResponse.json({ok:false,error:e instanceof Error&&e.message==="AUTH_REQUIRED"?"Admin access required":"Unable to load service catalog."},{status:401})}
}
export async function POST(req:Request){
 try{
  await requireAdmin();
  const body=await req.json();
  if(body?.action==="remove_zero_stocks"){
    const [services,countries]=await Promise.all([listServices(),listCountries()]);
    const settings=await collection<any>("settings");
    const catalog=await settings.findOne({_id:"serviceCatalog"});
    const hidden=new Set<string>(Array.isArray(catalog?.hiddenServices)?catalog.hiddenServices:[]);
    const zeroStock:string[]=[];
    let cursor=0;
    const worker=async()=>{
      while(true){
        const index=cursor++;
        if(index>=services.length)return;
        const service=services[index],id=String(service?.id??service?.code??service?.name??service?.title??"");
        if(!id)continue;
        try{
          const prices=await servicePrices(id,countries);
          const hasStock=Object.values(prices||{}).some((p:any)=>Number(p?.count||0)>0&&Number(p?.cost||0)>0);
          if(!hasStock){hidden.add(normalize(id));zeroStock.push(id);}
        }catch(error){console.error("[REMOVE ZERO STOCK CHECK]",id,error);}
      }
    };
    await Promise.all(Array.from({length:Math.min(4,services.length)},()=>worker()));
    await settings.updateOne({_id:"serviceCatalog"},{$set:{hiddenServices:[...hidden],updatedAt:new Date()}},{upsert:true});
    return NextResponse.json({ok:true,removed:zeroStock.length,services:hidden.size,removedServices:zeroStock,hiddenServices:[...hidden]});
  }
  const name=String(body?.name??"").trim();
  const action=body?.action==="restore"?"restore":"hide";
  if(!name||name.length>120)return NextResponse.json({ok:false,error:"Enter a valid exact service name."},{status:400});
  const services=await listServices();
  const found=services.find((s:any)=>[s.id,s.code,s.name,s.title].some(v=>normalize(v)===normalize(name)));
  const key=normalize(found?(found.id??found.code??found.name??found.title):name);
  if(!key)return NextResponse.json({ok:false,error:"Service name is invalid."},{status:400});
  const settings=await collection<any>("settings");
  const catalog=await settings.findOne({_id:"serviceCatalog"});
  const hidden=new Set<string>(Array.isArray(catalog?.hiddenServices)?catalog.hiddenServices:[]);
  if(action==="hide")hidden.add(key);else hidden.delete(key);
  await settings.updateOne({_id:"serviceCatalog"},{$set:{hiddenServices:[...hidden],updatedAt:new Date()}},{upsert:true});
  return NextResponse.json({ok:true,action,name:found?String(found.name??found.id??name):name,hiddenServices:[...hidden]});
 }catch(e){return NextResponse.json({ok:false,error:e instanceof Error&&e.message==="AUTH_REQUIRED"?"Admin access required":"Unable to update service catalog."},{status:401})}
}
