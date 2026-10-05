import {NextResponse} from "next/server";
import {cookies} from "next/headers";
import {getUser} from "@/lib/auth";
import {collection} from "@/lib/mongo";

export const runtime="nodejs";
export const dynamic="force-dynamic";

const DEVICE_COOKIE="numelixa_device_token";

export async function POST(req:Request){
  try{
    let body:any;
    try{ body=await req.json(); }
    catch{ return NextResponse.json({ok:false,error:"Invalid JSON body."},{status:400}); }

    const token=String(body.token||"").trim();
    const platform=String(body.platform||"android").trim().toLowerCase();

    if(!token||token.length<20){
      return NextResponse.json({ok:false,error:"Invalid device token."},{status:400});
    }

    const user=await getUser();
    const now=new Date();
    const devices=await collection<any>("deviceTokens");

    await devices.updateOne(
      {token},
      user
        ? {$set:{token,userId:String(user.id),platform,updatedAt:now},$setOnInsert:{createdAt:now}}
        : {$set:{token,platform,updatedAt:now},$setOnInsert:{createdAt:now,userId:null}},
      {upsert:true}
    );

    const jar=await cookies();
    jar.set(DEVICE_COOKIE,token,{
      httpOnly:true,
      secure:process.env.NODE_ENV==="production",
      sameSite:"lax",
      path:"/",
      maxAge:60*60*24*365
    });

    console.info("[NOTIFICATION DEVICE REGISTER]",{
      platform,
      authenticated:Boolean(user),
      userId:user?.id||null
    });

    return NextResponse.json({
      ok:true,
      registered:true,
      authenticated:Boolean(user),
      userId:user?.id||null
    });
  }catch(error){
    const message=error instanceof Error?error.message:String(error);
    console.error("[NOTIFICATION DEVICE REGISTER]",message);
    return NextResponse.json({ok:false,error:"Unable to register device."},{status:500});
  }
}
