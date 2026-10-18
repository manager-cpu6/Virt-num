import {NextResponse} from "next/server";
import {requireUser,tokenHash,passwordHash} from "@/lib/auth";
import {collection} from "@/lib/mongo";

export const runtime="nodejs";
export const dynamic="force-dynamic";

export async function POST(req:Request){
 try{
  const user=await requireUser();
  const body=await req.json().catch(()=>null);
  const code=String(body?.code||"").trim();
  const password=String(body?.newPassword||"");
  if(!/^\d{6}$/.test(code))return NextResponse.json({ok:false,error:"Enter the 6-digit code."},{status:400});
  if(password.length<8)return NextResponse.json({ok:false,error:"New password must be at least 8 characters."},{status:400});
  const tokens=await collection<any>("emailTokens");
  const record=await tokens.findOne({userId:String(user.id),type:"mobile_password_change_code",tokenHash:tokenHash(code),expiresAt:{$gt:new Date()}});
  if(!record)return NextResponse.json({ok:false,error:"Invalid or expired password code."},{status:400});
  await (await collection<any>("users")).updateOne({_id:String(user.id)},{$set:{password_hash:await passwordHash(password),passwordChangedAt:new Date(),updatedAt:new Date()}});
  await tokens.deleteMany({userId:String(user.id),type:"mobile_password_change_code"});
  return NextResponse.json({ok:true,changed:true});
 }catch(error){
  const message=error instanceof Error?error.message:"Unable to change password.";
  return NextResponse.json({ok:false,error:message==="AUTH_REQUIRED"?"Please sign in again.":"Unable to change password."},{status:message==="AUTH_REQUIRED"?401:500});
 }
}
