import {NextResponse} from "next/server";
import {cookies} from "next/headers";
import {collection} from "@/lib/mongo";
import {logout} from "@/lib/auth";
export const runtime="nodejs";
export async function POST(req:Request){
 try{
  const jar=await cookies();
  const token=String(jar.get("numelixa_device_token")?.value||"").trim();
  if(token.length>=20&&String(process.env.MONGODB_URI||"").trim()){
   await (await collection<any>("deviceTokens")).updateOne({token},{$set:{userId:null,enabled:true,updatedAt:new Date(),loggedOutAt:new Date()}});
  }
 }catch(error){console.error("[FCM_LOGOUT_UNLINK]",error instanceof Error?error.message:"Unable to unlink push device");}
 await logout();
 return NextResponse.redirect(new URL("/",req.url),303);
}
