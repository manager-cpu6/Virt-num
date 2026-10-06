import {NextResponse} from "next/server";
import {requireAdmin} from "@/lib/auth";
import {collection,mongoId} from "@/lib/mongo";
import {sendPush} from "@/lib/push";
import {sendEmail,emailTemplate} from "@/lib/mailer";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(){
  try{
    await requireAdmin();
    const deviceTokens = await collection<any>("deviceTokens");
    const users = await collection<any>("users");
    const emailSubscriptions = await collection<any>("notificationEmailSubscriptions");
    const emailRegisteredCount = await emailSubscriptions.countDocuments({enabled:true});
    const usersWithEmail = await users.countDocuments({email:{$exists:true,$ne:""}});
    const deviceCount = await deviceTokens.countDocuments({});
    const claimedDeviceCount = await deviceTokens.countDocuments({userId:{$nin:[null,""]}});
    const unclaimedDeviceCount = await deviceTokens.countDocuments({$or:[{userId:null},{userId:""}]});
    const verifiedGmailUsers = await users.find(
      {verifiedAt:{$exists:true,$ne:null},email:/@gmail\.com$/i},
      {projection:{_id:1}}
    ).toArray();
    const verifiedGmailIds = verifiedGmailUsers.map(u=>String(u._id));
    const verifiedGmailDeviceCount = verifiedGmailIds.length
      ? await deviceTokens.countDocuments({userId:{$in:verifiedGmailIds}})
      : 0;
    const rows = await (await collection<any>("notifications"))
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
        pushConfigured:Boolean(x.pushConfigured),
        pushDelivered:Boolean(x.pushDelivered),
        pushRetryCount:Number(x.pushRetryCount||0)
      })),
      deviceCount,
      claimedDeviceCount,
      unclaimedDeviceCount,
      verifiedGmailUsers:verifiedGmailUsers.length,
      verifiedGmailDeviceCount,
      emailRegisteredCount,
      usersWithEmail,
      serverPushConfigured:Boolean(process.env.FIREBASE_SERVICE_ACCOUNT_JSON || (process.env.FIREBASE_PROJECT_ID && process.env.FIREBASE_CLIENT_EMAIL && process.env.FIREBASE_PRIVATE_KEY))
    });
  }catch(error){
    console.error("[ADMIN NOTIFICATIONS GET]", error);
    const message = error instanceof Error ? error.message : String(error);
    const status = message==="AUTH_REQUIRED" || message==="ADMIN_REQUIRED" ? 401 : 500;
    return NextResponse.json(
      {ok:false,error:status===401?"Unauthorized":"Unable to load notifications."},
      {status}
    );
  }
}

export async function POST(req:Request){
  try{
    await requireAdmin();

    let body:any;
    try{
      body = await req.json();
    }catch{
      return NextResponse.json({ok:false,error:"Invalid JSON body."},{status:400});
    }

    const action = String(body.action||"").trim();
    if(action==="register_all" || action==="register_email"){
      const users = await collection<any>("users");
      const subs = await collection<any>("notificationEmailSubscriptions");
      const query = action==="register_all" ? {email:{$exists:true,$ne:""}} : {_id:String(body.userId||"")};
      const rows = await users.find(query,{projection:{_id:1,email:1,name:1}}).toArray();
      const valid = rows.filter((u:any)=>String(u.email||"").trim().includes("@"));
      if(!valid.length)return NextResponse.json({ok:false,error:"No users with valid email addresses found."},{status:404});
      const now=new Date();
      await subs.bulkWrite(valid.map((u:any)=>({updateOne:{filter:{userId:String(u._id)},update:{$set:{userId:String(u._id),email:String(u.email).trim().toLowerCase(),name:String(u.name||""),enabled:true,registeredByAdmin:true,updatedAt:now},$setOnInsert:{createdAt:now}},upsert:true}})));
      return NextResponse.json({ok:true,registered:valid.length});
    }

    const title = String(body.title||"").trim().slice(0,80);
    const message = String(body.message||"").trim().slice(0,500);
    const target = String(body.target||"all").trim();

    if(!title || !message){
      return NextResponse.json(
        {ok:false,error:"Title and message are required."},
        {status:400}
      );
    }

    if(target!=="all" && target!=="gmail" && target!=="non_gmail" && !target.startsWith("user:")){
      return NextResponse.json(
        {ok:false,error:"Invalid notification audience."},
        {status:400}
      );
    }

    const users = await collection<any>("users");
    const userIds = target==="all"
      ? await users.find({}, {projection:{_id:1}}).toArray()
      : target==="gmail"
        ? await users.find({email:/@gmail\.com$/i}, {projection:{_id:1}}).toArray()
      : target==="non_gmail"
        ? await users.find({
            $or:[
              {email:{$exists:false}},
              {email:null},
              {email:""},
              {email:{$not:/@gmail\.com$/i}}
            ]
          }, {projection:{_id:1}}).toArray()
        : await users.findOne(
            {_id:target.slice(5)},
            {projection:{_id:1}}
          ).then(u=>u ? [u] : []);

    if(!userIds.length){
      return NextResponse.json(
        {ok:false,error:"No target users found."},
        {status:404}
      );
    }

    const ids = userIds.map(u=>String(u._id));
    const notificationsCollection = await collection<any>("notifications");
    const notifications = userIds.map(u=>({
      _id:mongoId(),
      userId:String(u._id),
      title,
      message,
      adminSent:true,
      target,
      createdAt:new Date(),
      readAt:null,
      sentCount:0,
      pushConfigured:false,
      pushDelivered:false,
      pushRetryCount:0
    }));

    await notificationsCollection.insertMany(notifications);

    const devices = await (await collection<any>("deviceTokens"))
      .find({userId:{$in:ids}})
      .toArray();

    let pushResult: Awaited<ReturnType<typeof sendPush>> = {
      configured:false,
      successCount:0,
      failureCount:0,
      invalidTokens:[],
      errors:[]
    };
    let pushError:string|null = null;

    try{
      pushResult = await sendPush(
          devices.map(x=>String(x.token||"")),
          title,
          message
      );
    }catch(error){
      pushError = error instanceof Error ? error.message : String(error);
      console.error("[ADMIN NOTIFICATIONS PUSH]", pushError);
    }

    const emailSubs = await (await collection<any>("notificationEmailSubscriptions")).find({userId:{$in:ids},enabled:true}).toArray();
    let emailSent=0;
    let emailFailed=0;
    await Promise.all(emailSubs.map(async (sub:any)=>{
      try{
        await sendEmail(String(sub.email),title,emailTemplate(title,message,undefined,"Numelixa notification"));
        emailSent++;
      }catch(error){
        emailFailed++;
        console.error("[ADMIN NOTIFICATION EMAIL]",{email:sub.email,error:error instanceof Error?error.message:String(error)});
      }
    }));

    if(pushResult.invalidTokens?.length){
      await (await collection<any>("deviceTokens")).deleteMany({token:{$in:pushResult.invalidTokens}});
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
      emailRecipients:emailSubs.length,
      emailSent,
      emailFailed,
      pushError
    });
  }catch(error){
    console.error("[ADMIN NOTIFICATIONS POST]", error);
    const message = error instanceof Error ? error.message : String(error);
    const status = message==="AUTH_REQUIRED" || message==="ADMIN_REQUIRED" ? 401 : 500;

    return NextResponse.json(
      {
        ok:false,
        error:status===401
          ?"Unauthorized"
          :"Notification send failed. Check the server logs."
      },
      {status}
    );
  }
}
