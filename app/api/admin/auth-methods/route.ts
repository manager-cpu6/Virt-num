import {NextResponse} from "next/server";import {requireAdmin} from "@/lib/auth";import {getAuthSettings,setAuthSettings} from "@/lib/auth-methods";
export const runtime="nodejs";export const dynamic="force-dynamic";
export async function GET(){try{await requireAdmin();return NextResponse.json({ok:true,...await getAuthSettings()})}catch(e){return NextResponse.json({ok:false,error:e instanceof Error?e.message:"Unauthorized"},{status:401})}}
export async function POST(req:Request){try{await requireAdmin();const b=await req.json();const s=await setAuthSettings({phoneEnabled:Boolean(b.phoneEnabled),voiceEnabled:Boolean(b.voiceEnabled)});return NextResponse.json({ok:true,...s})}catch(e){return NextResponse.json({ok:false,error:e instanceof Error?e.message:"Unable to save"},{status:500})}}
