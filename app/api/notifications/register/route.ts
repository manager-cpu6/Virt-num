import {NextResponse} from "next/server";
import {requireUser} from "@/lib/auth";
import {collection} from "@/lib/mongo";

export const runtime="nodejs";
export const dynamic="force-dynamic";

export async function POST(req:Request){
  try{
    const user=await requireUser();
    let body:any;
    try{
      body=await req.json();
    }catch{
      return NextResponse.json({ok:false,error:"Invalid JSON body."},{status:400});
    }

    const token=String(body.token||"").trim();
    const platform=String(body.platform||"unknown").trim().toLowerCase();

    if(!token||token.length<20){
      return NextResponse.json({ok:false,error:"Invalid device token."},{status:400});
    }

    const now=new Date();
    await (await collection<any>("deviceTokens")).updateOne(
      {token},
      {
        $set:{
          token,
          userId:String(user.id),
          platform,
          updatedAt:now
        },
        $setOnInsert:{createdAt:now}
      },
      {upsert:true}
    );

    return NextResponse.json({ok:true,registered:true});
  }catch(error){
    const message=error instanceof Error?error.message:String(error);
    const status=message==="AUTH_REQUIRED"?401:500;
    console.error("[NOTIFICATION DEVICE REGISTER]",message);
    return NextResponse.json(
      {ok:false,error:status===401?"AUTH_REQUIRED":"Unable to register device."},
      {status}
    );
  }
}
