import {NextResponse} from "next/server";
import {requireUser} from "@/lib/auth";
import {collection} from "@/lib/mongo";

export const runtime="nodejs";
export const dynamic="force-dynamic";

const MAX_BYTES=450*1024;
const MIME=/^data:image\/(png|jpeg|webp);base64,([A-Za-z0-9+/=]+)$/;

export async function PUT(req:Request){
 try{
  const user=await requireUser();
  const body=await req.json().catch(()=>null);
  const avatar=String(body?.avatar||"");
  const match=avatar.match(MIME);
  if(!match)return NextResponse.json({ok:false,error:"Choose a PNG, JPEG, or WebP image."},{status:400});
  const bytes=Buffer.from(match[2],"base64");
  if(!bytes.length||bytes.length>MAX_BYTES)return NextResponse.json({ok:false,error:"Profile photo must be smaller than 450 KB."},{status:413});
  const users=await collection<any>("users");
  await users.updateOne({_id:String(user.id)},{$set:{avatarDataUrl:avatar,avatarUrl:avatar,updatedAt:new Date()}});
  return NextResponse.json({ok:true,avatarUrl:avatar},{headers:{"Cache-Control":"no-store"}});
 }catch(error){
  const message=error instanceof Error?error.message:"Unable to update profile photo.";
  return NextResponse.json({ok:false,error:message==="AUTH_REQUIRED"?"Please sign in again.":"Unable to update profile photo."},{status:message==="AUTH_REQUIRED"?401:500});
 }
}
