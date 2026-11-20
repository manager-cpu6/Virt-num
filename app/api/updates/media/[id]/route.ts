import {NextResponse} from "next/server";
import {GridFSBucket,ObjectId} from "mongodb";
import {collection,getMongoDb} from "@/lib/mongo";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function GET(_req:Request,{params}:{params:Promise<{id:string}>}){
 try{
  const {id}=await params;
  if(!/^[a-f0-9]{24}$/i.test(id))return NextResponse.json({ok:false,error:"Media not found."},{status:404});
  const settings=await (await collection<any>("settings")).findOne({_id:"updates"});
  if(settings?.enabled!==true)return NextResponse.json({ok:false,error:"Updates is currently unavailable."},{status:404});
  const db=await getMongoDb(),bucket=new GridFSBucket(db,{bucketName:"updatesMedia"}),objectId=new ObjectId(id);
  const files=await bucket.find({_id:objectId}).limit(1).toArray(),file=files[0];
  if(!file)return NextResponse.json({ok:false,error:"Media not found."},{status:404});
  const mediaPath="/api/updates/media/"+id;
  const post=await (await collection<any>("updatePosts")).findOne({status:"published","media.url":mediaPath},{projection:{channelId:1}});
  if(!post)return NextResponse.json({ok:false,error:"Media not found."},{status:404});
  const channel=await (await collection<any>("updateChannels")).findOne({_id:String(post.channelId),status:"active",visibility:{$ne:"private"}},{projection:{_id:1}});
  if(!channel)return NextResponse.json({ok:false,error:"Media not found."},{status:404});
  const type=String(file.contentType||file.metadata?.contentType||"application/octet-stream");
  if(!["image/png","image/jpeg","image/webp","image/gif","video/mp4","video/webm"].includes(type))return NextResponse.json({ok:false,error:"Unsupported media."},{status:415});
  const stream=bucket.openDownloadStream(objectId);
  const chunks:Buffer[]=[];
  for await(const chunk of stream)chunks.push(Buffer.isBuffer(chunk)?chunk:Buffer.from(chunk));
  const fullBody=Buffer.concat(chunks),range=_req.headers.get("range");
  const headers:Record<string,string>={"Content-Type":type,"Cache-Control":"private, no-store","X-Content-Type-Options":"nosniff","Accept-Ranges":"bytes"};
  if(range){
   const match=/^bytes=(\\d*)-(\\d*)$/.exec(range.trim());
   if(!match||(!match[1]&&!match[2]))return new Response(null,{status:416,headers:{"Content-Range":"bytes */"+fullBody.length,"Cache-Control":"private, no-store"}});
   let start:number,end:number;
   if(!match[1]){const suffix=Number(match[2]);if(!Number.isSafeInteger(suffix)||suffix<=0)return new Response(null,{status:416,headers:{"Content-Range":"bytes */"+fullBody.length}});start=Math.max(0,fullBody.length-suffix);end=fullBody.length-1;}
   else{start=Number(match[1]);end=match[2]?Number(match[2]):fullBody.length-1;}
   if(!Number.isSafeInteger(start)||!Number.isSafeInteger(end)||start<0||end<start||start>=fullBody.length)return new Response(null,{status:416,headers:{"Content-Range":"bytes */"+fullBody.length,"Cache-Control":"private, no-store"}});
   end=Math.min(end,fullBody.length-1);
   const body=fullBody.subarray(start,end+1);
   headers["Content-Length"]=String(body.length);
   headers["Content-Range"]="bytes "+start+"-"+end+"/"+fullBody.length;
   return new Response(new Uint8Array(body),{status:206,headers});
  }
  headers["Content-Length"]=String(fullBody.length);
  return new Response(new Uint8Array(fullBody),{headers});
 }catch(error){
  const message=error instanceof Error?error.message:"";
  return NextResponse.json({ok:false,error:"Media not found."},{status:404});
 }
}
