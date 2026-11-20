import {NextResponse} from "next/server";
import {GridFSBucket,ObjectId} from "mongodb";
import {getMongoDb} from "@/lib/mongo";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function GET(_req:Request,{params}:{params:Promise<{id:string}>}){
 try{
  const {id}=await params;
  if(!/^[a-f0-9]{24}$/i.test(id))return NextResponse.json({ok:false,error:"Media not found."},{status:404});
  const db=await getMongoDb(),bucket=new GridFSBucket(db,{bucketName:"updatesMedia"}),objectId=new ObjectId(id);
  const files=await bucket.find({_id:objectId}).limit(1).toArray(),file=files[0];
  if(!file)return NextResponse.json({ok:false,error:"Media not found."},{status:404});
  const type=String(file.contentType||file.metadata?.contentType||"application/octet-stream");
  if(!["image/png","image/jpeg","image/webp","image/gif","video/mp4","video/webm"].includes(type))return NextResponse.json({ok:false,error:"Unsupported media."},{status:415});
  const stream=bucket.openDownloadStream(objectId);
  const chunks:Buffer[]=[];
  for await(const chunk of stream)chunks.push(Buffer.isBuffer(chunk)?chunk:Buffer.from(chunk));
  const body=Buffer.concat(chunks);
  return new Response(body,{headers:{"Content-Type":type,"Content-Length":String(body.length),"Cache-Control":"public, max-age=86400, stale-while-revalidate=604800","X-Content-Type-Options":"nosniff","Content-Security-Policy":"default-src 'none'; sandbox"}});
 }catch(error){
  const message=error instanceof Error?error.message:"";
  return NextResponse.json({ok:false,error:"Media not found."},{status:404});
 }
}
