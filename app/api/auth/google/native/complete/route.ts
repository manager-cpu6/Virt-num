import {NextResponse} from "next/server";
import crypto from "crypto";
import {collection} from "@/lib/mongo";
import {createSession,requestMeta} from "@/lib/auth";
import {claimDeviceTokenForUser} from "@/lib/notifications";

export const runtime="nodejs";
export const dynamic="force-dynamic";
const hash=(v:string)=>crypto.createHash("sha256").update(v).digest("hex");

export async function POST(req:Request){
 try{
  const body=await req.json().catch(()=>null);
  const ticket=String(body?.ticket||"").trim();
  if(ticket.length<40)return NextResponse.json({ok:false,error:"Google sign-in ticket is missing or invalid."},{status:400});
  const tickets=await collection<any>("googleNativeOAuthTickets");
  const record=await tickets.findOneAndDelete({ticketHash:hash(ticket),expiresAt:{$gt:new Date()}});
  if(!record?.userId)return NextResponse.json({ok:false,error:"This Google sign-in has expired. Please try again."},{status:401});
  const user=await (await collection<any>("users")).findOne({_id:String(record.userId)},{projection:{suspendedAt:1,role:1}});
  if(!user||user.suspendedAt)return NextResponse.json({ok:false,error:"This account is suspended or unavailable."},{status:403});
  await createSession(String(record.userId),requestMeta(req.headers));
  await claimDeviceTokenForUser(String(record.userId));
  return NextResponse.json({ok:true,role:user.role||"user"},{headers:{"Cache-Control":"no-store"}});
 }catch(error){
  console.error("[NATIVE GOOGLE COMPLETE]",error);
  return NextResponse.json({ok:false,error:"Unable to finish Google sign-in. Please try again."},{status:500});
 }
}
