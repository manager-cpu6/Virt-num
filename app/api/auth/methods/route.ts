import {NextResponse} from "next/server";import {getAuthSettings} from "@/lib/auth-methods";
export const runtime="nodejs";export const dynamic="force-dynamic";
export async function GET(){try{return NextResponse.json({ok:true,...await getAuthSettings()})}catch{return NextResponse.json({ok:true,phoneEnabled:true,voiceEnabled:true})}}
