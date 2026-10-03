import {NextResponse} from "next/server";
import {collection} from "@/lib/mongo";
import {listServices} from "@/lib/fivesim";

export const runtime="nodejs";
export const dynamic="force-dynamic";

const POPULAR=[
 {service:"whatsapp",country:"us",label:"WhatsApp",flag:"🇺🇸"},
 {service:"telegram",country:"gb",label:"Telegram",flag:"🇬🇧"},
 {service:"instagram",country:"us",label:"Instagram",flag:"🇺🇸"},
 {service:"facebook",country:"ng",label:"Facebook",flag:"🇳🇬"},
 {service:"google",country:"us",label:"Google",flag:"🇺🇸"},
 {service:"tiktok",country:"ng",label:"TikTok",flag:"🇳🇬"}
];

function cleanService(v:any){return String(v||"Service").replace(/[_-]+/g," ").replace(/\b\w/g,c=>c.toUpperCase())}

export async function GET(){
 try{
  const orders=await collection<any>("orders");
  const docs=await orders.find(
   {status:{$in:["completed","success","received","code_received"]}},
   {projection:{service:1,country:1,phone:1,completedAt:1,createdAt:1,status:1}}
  ).sort({completedAt:-1,createdAt:-1}).limit(8).toArray();

  const activity=docs.map((o:any,i:number)=>({
   id:String(o._id||i),
   service:cleanService(o.service),
   country:String(o.country||"").toUpperCase(),
   phone:o.phone?String(o.phone).replace(/\d(?=\d{4})/g,"•"):"••••",
   type:"SMS received",
   time:new Date(o.completedAt||o.createdAt||Date.now()).toISOString()
  }));

  let services:any[]=[];
  try{services=(await listServices()).filter((s:any)=>POPULAR.some(p=>p.service===s.id)).map((s:any)=>s.id)}catch{}
  return NextResponse.json({ok:true,updatedAt:new Date().toISOString(),popular:POPULAR.map(p=>({...p,available:services.length===0?true:services.includes(p.service)})),activity});
 }catch{
  return NextResponse.json({ok:true,updatedAt:new Date().toISOString(),popular:POPULAR,activity:[]});
 }
}