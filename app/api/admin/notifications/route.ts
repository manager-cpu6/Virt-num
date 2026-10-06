import {NextResponse} from "next/server";
import {cookies} from "next/headers";
import {requireAdmin} from "@/lib/auth";
import {collection,mongoId} from "@/lib/mongo";
import {sendPush,isFirebaseConfigured} from "@/lib/push";

export const runtime="nodejs";
export const dynamic="force-dynamic";
export const maxDuration=300;

export async function GET(){
  try{
    await requireAdmin();
    const deviceTokens=await collection<any>("deviceTokens");
    const users=await collection<any>("users");
    const deviceCount=await deviceTokens.countDocuments({});
    const claimedDeviceCount=await deviceTokens.countDocuments({userId:{$nin:[null,""]}});
    const unclaimedDeviceCount=await deviceTokens.countDocuments({$or:[{userId:null},{userId:""}]});
    const verifiedGmailUsers=await users.find(
      {verifiedAt:{$exists:true,$ne:null},email:/@gmail\.com$/i},
      {projection:{_id:1}}
    ).toArray();
    const gmailIds=verifiedGmailUsers.map(u=>String(u._id));
    const verifiedGmailDeviceCount=gmailIds.length
      ? await deviceTokens.countDocuments({userId:{$in:gmailIds}})
      : 0;
    const rows=await (await collection<any>("notifications"))
      .find({adminSent:true})
      .sort({createdAt:-1})
      .limit(50)
      .toArray();

    return NextResponse.json({
      ok:true,
      notifications:rows.map(x=>({
        id:String(x._id),
        title:x.title,
        message:x.message,
        target:x.target,
        createdAt:x.createdAt,
        sentCount:Number(x.sentCount||0),
        failureCount:Number(x.failureCount||0),
        pushConfigured:Boolean(x.pushConfigured),
        pushDelivered:Boolean(x.pushDelivered),
        pushRetryCount:Number(x.pushRetryCount||0)
      })),
      deviceCount,
      claimedDeviceCount,
      unclaimedDeviceCount,
      verifiedGmailUsers:verifiedGmailUsers.length,
      verifiedGmailDeviceCount,
      serverPushConfigured:isFirebaseConfigured()
    });
  }catch(error){
    console.error("[ADMIN NOTIFICATIONS GET]",error);
    const message=error instanceof Error?error.message:String(error);
    const status=message==="AUTH_REQUIRED"||message==="ADMIN_REQUIRED"?401:500;
    return NextResponse.json({ok:false,error:status===401?"Unauthorized":"Unable to load notifications."},{status});
  }
}

export async function POST(req:Request){
  try{
    await requireAdmin();

    let body:any;
    try{body=await req.json();}catch{
      return NextResponse.json({ok:false,error:"Invalid JSON body."},{status:400});
    }

    const action=String(body.action||"").trim();

    if(action==="test_current_device"){
      const token=String((await cookies()).get("numelixa_device_token")?.value||"").trim();
      if(!token){
        return NextResponse.json({
          ok:false,
          error:"This admin device has no registered FCM token. Open the latest Numelixa Android app and allow notifications first."
        },{status:409});
      }

      const result=await sendPush(
        [token],
        "🔔 Numelixa notification test",
        "Firebase push is working on this Android device.",
        {url:"/account",type:"diagnostic",test:"1"}
      );

      if(result.invalidTokens?.length){
        await (await collection<any>("deviceTokens")).deleteMany({token:{$in:result.invalidTokens}});
      }

      return NextResponse.json({
        ok:result.successCount>0,
        sent:result.successCount,
        failed:result.failureCount,
        configured:result.configured,
        errors:result.errors||[],
        message:result.successCount>0
          ?"Native Firebase notification sent to this Android device."
          :"Native Firebase notification could not be delivered to this Android device."
      },{status:result.successCount>0?200:502});
    }

    const title=String(body.title||"").trim().slice(0,80);
    const message=String(body.message||"").trim().slice(0,500);
    const target=String(body.target||"all").trim();

    if(!title||!message){
      return NextResponse.json({ok:false,error:"Title and message are required."},{status:400});
    }

    if(target!=="all"&&target!=="gmail"&&target!=="non_gmail"&&!target.startsWith("user:")){
      return NextResponse.json({ok:false,error:"Invalid notification audience."},{status:400});
    }

    const users=await collection<any>("users");
    const userRows=target==="all"
      ? await users.find({}, {projection:{_id:1}}).toArray()
      : target==="gmail"
        ? await users.find({email:/@gmail\.com$/i},{projection:{_id:1}}).toArray()
        : target==="non_gmail"
          ? await users.find({
              $or:[
                {email:{$exists:false}},
                {email:null},
                {email:""},
                {email:{$not:/@gmail\.com$/i}}
              ]
            },{projection:{_id:1}}).toArray()
          : await users.findOne({_id:target.slice(5)},{projection:{_id:1}}).then(u=>u?[u]:[]);

    if(!userRows.length){
      return NextResponse.json({ok:false,error:"No target users found."},{status:404});
    }

    const ids=userRows.map(u=>String(u._id));
    const now=new Date();
    const notificationsCollection=await collection<any>("notifications");
    const notifications=userRows.map(u=>({
      _id:mongoId(),
      userId:String(u._id),
      title,
      message,
      adminSent:true,
      target,
      createdAt:now,
      readAt:null,
      sentCount:0,
      pushConfigured:false,
      pushDelivered:false,
      pushRetryCount:0
    }));

    await notificationsCollection.insertMany(notifications);

    const devices=await (await collection<any>("deviceTokens"))
      .find({userId:{$in:ids}})
      .toArray();

    let pushResult:Awaited<ReturnType<typeof sendPush>>={
      configured:false,
      successCount:0,
      failureCount:0,
      invalidTokens:[],
      errors:[]
    };
    let pushError:string|null=null;

    try{
      pushResult=await sendPush(
        devices.map(x=>String(x.token||"")),
        title,
        message,
        {url:"/account",type:"admin_notification"}
      );
    }catch(error){
      pushError=error instanceof Error?error.message:String(error);
      console.error("[ADMIN NOTIFICATIONS PUSH]",pushError);
    }

    if(pushResult.invalidTokens?.length){
      await (await collection<any>("deviceTokens"))
        .deleteMany({token:{$in:pushResult.invalidTokens}});
    }

    await notificationsCollection.updateMany(
      {_id:{$in:notifications.map(x=>x._id)}},
      {$set:{
        sentCount:pushResult.successCount,
        failureCount:pushResult.failureCount,
        pushErrors:pushResult.errors||[],
        pushConfigured:pushResult.configured,
        pushDelivered:pushResult.successCount>0,
        pushRetryCount:1,
        pushError,
        updatedAt:new Date()
      }}
    );

    return NextResponse.json({
      ok:true,
      recipients:ids.length,
      devices:devices.length,
      sent:pushResult.successCount,
      failed:pushResult.failureCount,
      pushConfigured:pushResult.configured,
      errors:pushResult.errors||[],
      emailRecipients:0,
      emailSent:0,
      emailFailed:0,
      pushError
    });
  }catch(error){
    console.error("[ADMIN NOTIFICATIONS POST]",error);
    const message=error instanceof Error?error.message:String(error);
    const status=message==="AUTH_REQUIRED"||message==="ADMIN_REQUIRED"?401:500;
    return NextResponse.json({
      ok:false,
      error:status===401?"Unauthorized":"Notification send failed. Check the server logs."
    },{status});
  }
}
