import {NextResponse} from "next/server";
import {requireUser} from "@/lib/auth";
import {collection} from "@/lib/mongo";
import {sendPush} from "@/lib/push";

export const runtime="nodejs";
export const dynamic="force-dynamic";

export async function POST(req:Request){
  try{
    const body=await req.json().catch(()=>null);
    const token=String(body?.token||"").trim();
    const platform=String(body?.platform||"unknown").trim().toLowerCase();

    if(!token||token.length<20){
      return NextResponse.json({ok:false,error:"Invalid device token."},{status:400});
    }

    // Device registration is deliberately independent from login, but it
    // still requires the same MongoDB storage used by accounts and sessions.
    // Fail explicitly instead of silently leaving the admin dashboard at zero.
    if(!String(process.env.MONGODB_URI||"").trim()){
      return NextResponse.json(
        {ok:false,error:"PUSH_STORAGE_NOT_CONFIGURED",message:"Notification device storage is not configured on the server."},
        {status:503}
      );
    }

    const user=await (async()=>{
      try{return await requireUser()}catch(error){
        if(error instanceof Error&&error.message==="AUTH_REQUIRED")return null;
        throw error;
      }
    })();

    const devices=await collection<any>("deviceTokens");
    const now=new Date();

    // Register every valid native token even when the web session is still
    // loading. It is marked unlinked until the user signs in; this makes the
    // admin device counter truthful and removes the startup/auth race.
    if(!user){
      await devices.updateOne(
        {token},
        {
          $set:{
            token,
            platform,
            updatedAt:now,
            lastSeenAt:now
          },
          // Do not unlink a previously authenticated device when the app
          // starts before its session cookie is restored. New devices remain
          // unlinked until a real account session is available.
          $setOnInsert:{createdAt:now,userId:null}
        },
        {upsert:true}
      );

      const response=NextResponse.json(
        {ok:true,registered:true,linked:false,pending:true},
        {status:200}
      );
      response.cookies.set("numelixa_device_token_pending",token,{
        httpOnly:true,
        secure:process.env.NODE_ENV==="production",
        sameSite:"lax",
        path:"/",
        maxAge:60*10
      });
      return response;
    }

    const users=await collection<any>("users");

    await devices.updateOne(
      {token},
      {
        $set:{
          token,
          userId:String(user.id),
          platform,
          updatedAt:now,
          lastSeenAt:now
        },
        $setOnInsert:{createdAt:now}
      },
      {upsert:true}
    );

    const account=await users.findOne({_id:String(user.id)},{projection:{pushWelcomeSentAt:1,name:1}});
    if(!account?.pushWelcomeSentAt){
      try{
        const result=await sendPush(
          [token],
          "👋 Welcome to Numelixa",
          "Your Numelixa notifications are now active. We will alert you about SMS codes, purchases, wallet activity and important updates.",
          {type:"welcome",url:"/"}
        );
        if(result.successCount>0){
          await users.updateOne({_id:String(user.id)},{$set:{pushWelcomeSentAt:new Date()}});
        }
      }catch(error){
        console.error("[WELCOME PUSH]",error);
      }
    }

    const response=NextResponse.json({ok:true,registered:true,linked:true});
    response.cookies.set("numelixa_device_token",token,{httpOnly:true,secure:process.env.NODE_ENV==="production",sameSite:"lax",path:"/",maxAge:60*60*24*365});
    response.cookies.delete("numelixa_device_token_pending");
    return response;
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
