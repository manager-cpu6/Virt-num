import {NextResponse} from "next/server";
import {requireUser} from "@/lib/auth";
import {collection} from "@/lib/mongo";
export const runtime="nodejs";export const dynamic="force-dynamic";
export async function GET(){try{const user=await requireUser(),settings=await (await collection<any>("updatesSettings")).findOne({_id:"global"});return NextResponse.json({ok:true,enabled:settings?.enabled===true,hideUpdates:user.hideUpdates===true})}catch{return NextResponse.json({ok:false,error:"Unauthorized"},{status:401})}}
export async function PATCH(req:Request){try{const user=await requireUser(),b=await req.json();if(typeof b.hideUpdates!=="boolean")return NextResponse.json({ok:false,error:"Choose whether to hide Updates."},{status:400});await (await collection<any>("users")).updateOne({_id:user.id},{$set:{hideUpdates:b.hideUpdates,updatedAt:new Date()}});return NextResponse.json({ok:true,hideUpdates:b.hideUpdates})}catch{return NextResponse.json({ok:false,error:"Unable to update Updates preferences."},{status:401})}}
