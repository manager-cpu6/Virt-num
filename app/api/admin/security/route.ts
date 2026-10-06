import {NextResponse} from "next/server";
import {requireAdmin} from "@/lib/auth";
import {collection} from "@/lib/mongo";
import {extraSecurityEnabled,setLoginSecurity} from "@/lib/login-security";
export const runtime="nodejs";export const dynamic="force-dynamic";
export async function GET(){try{await requireAdmin();const enabled=await extraSecurityEnabled();return NextResponse.json({ok:true,mode:enabled?"extra":"normal"});}catch{return NextResponse.json({ok:false,error:"Unauthorized"},{status:401});}}
export async function POST(req:Request){try{await requireAdmin();const b=await req.json().catch(()=>({}));const mode=String(b.mode||"").toLowerCase();if(mode!=="normal"&&mode!=="extra")return NextResponse.json({ok:false,error:"Invalid security mode."},{status:400});await setLoginSecurity(mode as "normal"|"extra");return NextResponse.json({ok:true,mode});}catch{return NextResponse.json({ok:false,error:"Unable to update security mode."},{status:500});}}
