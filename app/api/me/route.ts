import {NextResponse} from "next/server";import {getUser} from "@/lib/auth";export const dynamic="force-dynamic";export async function GET(){return NextResponse.json({ok:true,user:await getUser()})}
