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

    const user=await (async()=>{
      try{return await requireUser()}catch(error){
        if(error instanceof Error&&error.message==="AUTH_REQUIRED")return null;
        throw error;
      }
    })();

    // Keep the current FCM token in a short server-side handoff cookie even
    // before login. It is NOT linked to any account until authentication
    // succeeds. This closes the login/signup timing gap.
    if(!user){
      const response=NextResponse.json(
        {ok:false,registered:false,linked:false,error:"AUTH_REQUIRED",pending:true},
        {status:401}
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

    const devices=await collection<any>("deviceTokens");
    const users=await collection<any>("users");
    const now=new Date();

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

    // The first successful token registration is the reliable point at which
    // the account is both authenticated and reachable by native push.
    // Send the welcome push exactly once per account.
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
