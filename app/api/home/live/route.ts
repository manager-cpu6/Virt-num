import {NextResponse} from "next/server";
import {collection} from "@/lib/mongo";
import {getUser} from "@/lib/auth";
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
function maskedPhone(v:any){
 const raw=String(v||"").trim();
 if(!raw)return "••••";
 const digits=raw.replace(/\D/g,"");
 if(digits.length<=4)return "••••";
 return raw.replace(/\d(?=(?:\D*\d){4})/g,"•");
}

export async function GET(){
 try{
  const user=await getUser().catch(()=>null);
  let services:any[]=[];
  try{services=(await listServices()).map((s:any)=>String(s.id||""))}catch{}
  const popular=POPULAR.map(p=>({...p,available:services.includes(p.service)}));
  if(!user)return NextResponse.json({ok:true,updatedAt:new Date().toISOString(),popular,activeNumbers:[],activity:[]});
  const orders=await collection<any>("orders");
  const userId=String(user.id||"");
  const [activeDocs,activityDocs]=await Promise.all([
   orders.find(
    {userId,status:"waiting"},
    {projection:{service:1,country:1,phoneNumber:1,phone:1,createdAt:1,expiresAt:1,status:1}}
   ).sort({createdAt:-1}).limit(4).toArray(),
   orders.find(
    {userId,status:{$in:["completed","success","received","code_received"]}},
    {projection:{service:1,country:1,phoneNumber:1,phone:1,completedAt:1,createdAt:1,status:1}}
   ).sort({completedAt:-1,createdAt:-1}).limit(8).toArray()
  ]);
  const activeNumbers=activeDocs.map((o:any,i:number)=>({
   id:String(o._id||i),service:cleanService(o.service),
   country:String(o.country||"").toUpperCase(),
   phone:maskedPhone(o.phoneNumber||o.phone),
   status:String(o.status||"waiting"),
   createdAt:new Date(o.createdAt||Date.now()).toISOString(),
   expiresAt:o.expiresAt?new Date(o.expiresAt).toISOString():null
  }));
  const activity=activityDocs.map((o:any,i:number)=>({
   id:String(o._id||i),service:cleanService(o.service),
   country:String(o.country||"").toUpperCase(),
   phone:maskedPhone(o.phoneNumber||o.phone),
   type:"SMS received",
   time:new Date(o.completedAt||o.createdAt||Date.now()).toISOString()
  }));
  return NextResponse.json({ok:true,updatedAt:new Date().toISOString(),popular,activeNumbers,activity},{headers:{"Cache-Control":"no-store"}});
 }catch{
  return NextResponse.json({ok:true,updatedAt:new Date().toISOString(),popular:POPULAR,activeNumbers:[],activity:[]},{headers:{"Cache-Control":"no-store"}});
 }
}