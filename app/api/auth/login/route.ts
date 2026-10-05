import {NextResponse} from "next/server";
import {collection} from "@/lib/mongo";
import {createSession,passwordCheck,ensureAdmin} from "@/lib/auth";
import {claimDeviceTokenForUser} from "@/lib/notifications";
export const runtime="nodejs";export const dynamic="force-dynamic";
export async function POST(req:Request){
  try{
    const b=await req.json(),
      email=String(b.email||"").trim().toLowerCase(),
      password=String(b.password||"");
    if(!email||!password)return NextResponse.json({ok:false,error:"Email and password are required."},{status:400});
    if(email===(process.env.ADMIN_EMAIL||"").trim().toLowerCase())await ensureAdmin();
    const u=await (await collection<any>("users")).findOne({email});
    if(!u||!(await passwordCheck(password,u.password_hash)))return NextResponse.json({ok:false,error:"Invalid email or password."},{status:401});
    await createSession(String(u._id));
    await claimDeviceTokenForUser(String(u._id));
    return NextResponse.json({ok:true,role:u.role});
  }catch(e){
    return NextResponse.json({ok:false,error:e instanceof Error?e.message:"Login failed"},{status:500});
  }
}
