import {NextResponse} from "next/server";
import {GridFSBucket} from "mongodb";
import {Readable} from "node:stream";
import {requireAdmin} from "@/lib/auth";
import {getMongoDb} from "@/lib/mongo";
export const runtime="nodejs";
export const dynamic="force-dynamic";
const MAX_BYTES=8*1024*1024;
function validMagic(type:string,b:Buffer){
 if(type==="image/png")return b.length>8&&b.subarray(0,8).equals(Buffer.from([137,80,78,71,13,10,26,10]));
 if(type==="image/jpeg")return b.length>3&&b[0]===255&&b[1]===216&&b[2]===255;
 if(type==="image/webp")return b.length>12&&b.toString("ascii",0,4)==="RIFF"&&b.toString("ascii",8,12)==="WEBP";
 if(type==="image/gif")return b.length>6&&/^GIF8[79]a$/.test(b.toString("ascii",0,6));
 if(type==="video/mp4")return b.length>12&&b.toString("ascii",4,8)==="ftyp";
 if(type==="video/webm")return b.length>4&&b[0]===0x1a&&b[1]===0x45&&b[2]===0xdf&&b[3]===0xa3;
 return false;
}
export async function POST(req:Request){
 try{
  const admin=await requireAdmin();
  const form=await req.formData(),file=form.get("file");
  if(!(file instanceof File))return NextResponse.json({ok:false,error:"Choose an image or video file."},{status:400});
  const type=String(file.type||"").toLowerCase();
  if(!["image/png","image/jpeg","image/webp","image/gif","video/mp4","video/webm"].includes(type))return NextResponse.json({ok:false,error:"Supported media: PNG, JPEG, WebP, GIF, MP4 and WebM."},{status:415});
  if(file.size<1||file.size>MAX_BYTES)return NextResponse.json({ok:false,error:"Media must be smaller than 8 MB."},{status:413});
  const bytes=Buffer.from(await file.arrayBuffer());
  if(!validMagic(type,bytes))return NextResponse.json({ok:false,error:"The file content does not match its declared media type."},{status:415});
  const bucket=new GridFSBucket(await getMongoDb(),{bucketName:"updatesMedia"});
  const name=String(file.name||"upload").replace(/[^a-zA-Z0-9._-]/g,"_").slice(0,120);
  const stream=bucket.openUploadStream(name,{metadata:{uploadedBy:String(admin.id),createdAt:new Date(),size:bytes.length,contentType:type}});
  await new Promise<void>((resolve,reject)=>{stream.once("finish",()=>resolve());stream.once("error",reject);stream.end(bytes);});
  return NextResponse.json({ok:true,media:{id:String(stream.id),url:"/api/updates/media/"+String(stream.id),type:type.startsWith("video/")?"video":"image",contentType:type,size:bytes.length}},{status:201});
 }catch(error){
  const message=error instanceof Error?error.message:"";
  const status=message==="AUTH_REQUIRED"||message==="ADMIN_REQUIRED"?401:500;
  return NextResponse.json({ok:false,error:status===401?"Unauthorized":"Unable to store media."},{status});
 }
}
