import {NextResponse} from "next/server";
import {listServices} from "@/lib/fivesim";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function GET(){try{return NextResponse.json({ok:true,services:await listServices()})}catch{return NextResponse.json({ok:false,services:[]},{status:502})}}