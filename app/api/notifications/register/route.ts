import {NextResponse} from "next/server";
import {requireUser, getUser} from "@/lib/auth";
import {collection} from "@/lib/mongo";

export const runtime="nodejs";
export const dynamic="force-dynamic";

/**
 * Register an Android FCM token.
 *
 * Important: the FCM token can arrive before the user finishes logging in.
 * We therefore store it immediately with userId:null and attach it to the
 * authenticated user on the next sync. This removes the login/FCM race.
 */
export async function POST(req:Request){
  try{
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

    const user=await getUser();
    const now=new Date();
    const devices=await collection<any>("deviceTokens");

    // Never unbind a token that is already linked to a user just because
    // this request arrived before the auth cookie was ready. This prevents
    // a verified user's push device from disappearing during auth races.
    if(user){
      await devices.updateOne(
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
    }else{
      await devices.updateOne(
        {token},
        {
          $set:{
            token,
            platform,
            updatedAt:now
          },
          $setOnInsert:{
            createdAt:now,
            userId:null
          }
        },
        {upsert:true}
      );
    }

    return NextResponse.json({
      ok:true,
      registered:true,
      authenticated:Boolean(user)
    });
  }catch(error){
    const message=error instanceof Error?error.message:String(error);
    console.error("[NOTIFICATION DEVICE REGISTER]",message);
    return NextResponse.json(
      {ok:false,error:"Unable to register device."},
      {status:500}
    );
  }
}
