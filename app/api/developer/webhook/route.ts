import crypto from "crypto";
import {NextResponse} from "next/server";
import {requireUser} from "@/lib/auth";
import {collection} from "@/lib/mongo";
import {deliverDeveloperWebhook} from "@/lib/developer-webhook";

export const runtime="nodejs";
export const dynamic="force-dynamic";

function validUrl(value:string){
 try{
  const u=new URL(value),h=u.hostname.toLowerCase();
  if(u.protocol!=="https:"||u.username||u.password||h==="localhost"||h.endsWith(".localhost")||h.endsWith(".local")||h==="0.0.0.0"||h==="127.0.0.1"||h==="::1"||/^10\./.test(h)||/^192\.168\./.test(h)||/^172\.(1[6-9]|2\d|3[01])\./.test(h))return false;
  return true;
 }catch{return false}
}
function publicConfig(row:any){
 return {url:row?.url||"",enabled:Boolean(row?.enabled),createdAt:row?.createdAt||null,updatedAt:row?.updatedAt||null,lastDeliveryAt:row?.lastDeliveryAt||null,lastStatus:row?.lastStatus??null,lastEvent:row?.lastEvent||null,lastError:row?.lastError||null,secretConfigured:Boolean(row?.secret)};
}
export async function GET(){
 try{const u=await requireUser(),row=await (await collection<any>("developerWebhooks")).findOne({userId:u.id});return NextResponse.json({ok:true,webhook:publicConfig(row)})}
 catch{return NextResponse.json({ok:false,error:"Please sign in to manage webhooks."},{status:401})}
}
export async function PUT(req:Request){
 try{
  const u=await requireUser(),body=await req.json(),url=String(body.url||"").trim(),enabled=body.enabled!==false;
  if(!validUrl(url))return NextResponse.json({ok:false,error:"Enter a public HTTPS webhook URL (for example https://example.com/webhooks/numelixa). Local/private addresses are not allowed."},{status:400});
  const hooks=await collection<any>("developerWebhooks"),old=await hooks.findOne({userId:u.id}),now=new Date();
  const secret=old?.secret||("whsec_"+crypto.randomBytes(32).toString("hex"));
  await hooks.updateOne({userId:u.id},{$set:{userId:u.id,url,enabled,secret,updatedAt:now},$setOnInsert:{createdAt:now}},{upsert:true});
  const row=await hooks.findOne({userId:u.id});
  return NextResponse.json({ok:true,webhook:publicConfig(row),...(old?.secret?{}:{signingSecret:secret})});
 }catch{return NextResponse.json({ok:false,error:"Unable to save webhook settings."},{status:500})}
}
export async function DELETE(){
 try{const u=await requireUser();await (await collection<any>("developerWebhooks")).deleteOne({userId:u.id});return NextResponse.json({ok:true,deleted:true})}
 catch{return NextResponse.json({ok:false,error:"Unable to delete webhook settings."},{status:500})}
}
export async function POST(){
 try{
  const u=await requireUser(),row=await (await collection<any>("developerWebhooks")).findOne({userId:u.id,enabled:true});
  if(!row?.url||!row.secret)return NextResponse.json({ok:false,error:"Save and enable a webhook URL before sending a test."},{status:409});
  await deliverDeveloperWebhook(u.id,"order.created",{test:true,message:"Numelixa webhook test event"});
  return NextResponse.json({ok:true,message:"Test delivery attempted. Check the endpoint and the webhook status."});
 }catch{return NextResponse.json({ok:false,error:"Unable to send webhook test."},{status:500})}
}
