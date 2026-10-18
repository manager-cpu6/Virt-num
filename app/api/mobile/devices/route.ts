import crypto from "crypto";
import {NextResponse} from "next/server";
import {requireUser} from "@/lib/auth";
import {collection} from "@/lib/mongo";

export const runtime="nodejs";
export const dynamic="force-dynamic";
const hash=(v:string)=>crypto.createHash("sha256").update(v).digest("hex");

export async function GET(req:Request){
 try{
  const user=await requireUser();
  const auth=String(req.headers.get("authorization")||"");
  const raw=auth.toLowerCase().startsWith("bearer ")?auth.slice(7).trim():"";
  const currentHash=raw?hash(raw):"";
  const rows=await (await collection<any>("sessions"))
   .find({userId:String(user.id),expiresAt:{$gt:new Date()}})
   .sort({lastSeenAt:-1,createdAt:-1}).toArray();
  return NextResponse.json({ok:true,devices:rows.map((s:any)=>({
   sessionId:String(s._id),
   current:Boolean(currentHash&&s.tokenHash===currentHash),
   device:String(s.device||"Device"),
   browser:String(s.browser||"App"),
   platform:String(s.platform||"Unknown"),
   city:String(s.city||""),
   region:String(s.region||""),
   country:String(s.country||""),
   createdAt:s.createdAt||null,
   lastSeenAt:s.lastSeenAt||s.createdAt||null,
   expiresAt:s.expiresAt||null
  }))},{headers:{"Cache-Control":"no-store"}});
 }catch(error){
  const message=error instanceof Error?error.message:"Unable to load devices.";
  return NextResponse.json({ok:false,error:message==="AUTH_REQUIRED"?"Please sign in again.":"Unable to load devices."},{status:message==="AUTH_REQUIRED"?401:500});
 }
}

export async function DELETE(req:Request){
 try{
  const user=await requireUser();
  const body=await req.json().catch(()=>null);
  const sessionId=String(body?.sessionId||"").trim();
  if(!sessionId)return NextResponse.json({ok:false,error:"Session ID is required."},{status:400});
  const result=await (await collection<any>("sessions")).deleteOne({_id:sessionId,userId:String(user.id)});
  if(!result.deletedCount)return NextResponse.json({ok:false,error:"Device session not found or already removed."},{status:404});
  return NextResponse.json({ok:true,removed:true});
 }catch(error){
  const message=error instanceof Error?error.message:"Unable to remove device.";
  return NextResponse.json({ok:false,error:message==="AUTH_REQUIRED"?"Please sign in again.":"Unable to remove device."},{status:message==="AUTH_REQUIRED"?401:500});
 }
}
