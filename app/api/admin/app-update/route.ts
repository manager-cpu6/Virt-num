import {NextResponse} from "next/server";
import {requireAdmin} from "@/lib/auth";
import {collection,mongoId} from "@/lib/mongo";
import {sendPush, type PushSendResult} from "@/lib/push";

export const runtime="nodejs";
export const dynamic="force-dynamic";
export const maxDuration=300;

export async function GET(){
  try{
    await requireAdmin();
    const rows=await (await collection<any>("appUpdates")).find({}).sort({publishedAt:-1}).limit(20).toArray();
    return NextResponse.json({ok:true,updates:rows.map(x=>({
      id:String(x.releaseId||x._id),version:x.version,versionCode:Number(x.versionCode||0),sizeMb:x.sizeMb,sizeBytes:Number(x.sizeBytes||0),apkUrl:x.apkUrl,installRequired:Boolean(x.installRequired||x.force),
      releaseNotes:x.releaseNotes,force:Boolean(x.force),published:Boolean(x.published),
      publishedAt:x.publishedAt,pushSent:Number(x.pushSent||0),pushFailed:Number(x.pushFailed||0)
    }))});
  }catch(error){
    const message=error instanceof Error?error.message:String(error);
    return NextResponse.json({ok:false,error:message==="AUTH_REQUIRED"||message==="ADMIN_REQUIRED"?"Unauthorized":"Unable to load updates."},{status:401});
  }
}

export async function POST(req:Request){
  try{
    await requireAdmin();
    const body=await req.json();
    const version=String(body.version||"").trim().slice(0,30);
    const sourceApkUrl=String(body.apkUrl||"").trim();
    const releaseNotes=String(body.releaseNotes||"").trim().slice(0,1200);
    const manualSizeMb=Number(body.sizeMb||0);
    const versionCode=Number(body.versionCode||0);
    
    const installRequired=Boolean(body.installRequired);
    // Hard install updates are the only updates that can block the app.
    // Keep legacy force=true records compatible with the install-required behavior.
    const force=installRequired || Boolean(body.force);
    const sendAll=body.sendAll!==false;

    if(!version||!sourceApkUrl)
      return NextResponse.json({ok:false,error:"Version and APK source URL are required."},{status:400});

    let sourceUrl:URL;
    try{sourceUrl=new URL(sourceApkUrl)}catch{
      return NextResponse.json({ok:false,error:"Invalid APK source URL."},{status:400});
    }
    const allowedHosts=new Set([
      "github.com","www.github.com",
      "objects.githubusercontent.com","release-assets.githubusercontent.com",
      "raw.githubusercontent.com","githubusercontent.com"
    ]);
    if(sourceUrl.protocol!=="https:"||!allowedHosts.has(sourceUrl.hostname.toLowerCase())){
      return NextResponse.json({ok:false,error:"APK source must be a GitHub HTTPS release/file URL."},{status:400});
    }

    let sizeBytes=0;
    if(manualSizeMb>0){
      sizeBytes=Math.round(manualSizeMb*1024*1024);
    }else{
      const sizeResponse=await fetch(sourceUrl,{method:"HEAD",redirect:"follow",cache:"no-store"});
      sizeBytes=Number(sizeResponse.headers.get("content-length")||0);
      if(!Number.isFinite(sizeBytes)||sizeBytes<=0){
        const rangeResponse=await fetch(sourceUrl,{method:"GET",headers:{Range:"bytes=0-0"},redirect:"follow",cache:"no-store"});
        const contentRange=rangeResponse.headers.get("content-range")||"";
        const match=contentRange.match(/\/([0-9]+)$/);
        sizeBytes=match?Number(match[1]):Number(rangeResponse.headers.get("content-length")||0);
        try{await rangeResponse.body?.cancel();}catch{}
      }
      if(!Number.isFinite(sizeBytes)||sizeBytes<=0)
        return NextResponse.json({ok:false,error:"Unable to detect the APK file size."},{status:400});
    }
    const sizeMb=Number((sizeBytes/(1024*1024)).toFixed(2));
    const releaseId=mongoId();
    // Keep GitHub as the private source; users download through apk.numelixa.com.
    // This avoids exposing GitHub and does not require Vercel Blob credentials.
    const apkUrl="https://apk.numelixa.com/android";
    const now=new Date();
    const targetCreatedBefore=force?now:null;
    const doc={
      _id:releaseId,releaseId,version,versionCode,sizeMb,sizeBytes,apkUrl,sourceApkUrl,releaseNotes,installRequired,force,published:true,
      publishedAt:now,createdAt:now,targetCreatedBefore,pushSent:0,pushFailed:0
    };
    const updates=await collection<any>("appUpdates");
    await updates.updateMany({published:true},{$set:{published:false}});
    await updates.insertOne(doc);

    let push:PushSendResult={configured:false,successCount:0,failureCount:0,invalidTokens:[],errors:[]};
    if(sendAll){
      // Only notify users who already existed when this release was published.
      // This keeps a later signup from receiving an old release notification.
      const users=await collection<any>("users");
      const existingUsers=await users.find(
        {createdAt:{$lte:now}},
        {projection:{_id:1}}
      ).toArray();
      const existingUserIds=existingUsers.map(x=>String(x._id));

      const notifications=await collection<any>("notifications");
      if(existingUserIds.length){
        await notifications.insertMany(existingUserIds.map(userId=>({
          _id:mongoId(),
          userId,
          title:"🚀 New Numelixa update",
          message:"Version "+version+" is ready. Update now for the latest Numelixa experience.",
          adminSent:true,
          target:"app_update",
          type:"app_update",
          version,
          releaseId,
          createdAt:now,
          readAt:null,
          sentCount:0,
          pushConfigured:false
        })));

        const devices=await (await collection<any>("deviceTokens"))
          .find({userId:{$in:existingUserIds}})
          .toArray();

        push=await sendPush(
          devices.map(x=>String(x.token||"")),
          "🚀 New Numelixa update",
          "Version "+version+" is ready. Update now for the latest Numelixa experience.",
          {url:"/account?update=1",type:"app_update",version,releaseId}
        );

        if(push.invalidTokens?.length){
          await (await collection<any>("deviceTokens"))
            .deleteMany({token:{$in:push.invalidTokens}});
        }

        await notifications.updateMany(
          {releaseId},
          {$set:{
            sentCount:push.successCount,
            failureCount:push.failureCount,
            pushErrors:push.errors||[],
            pushConfigured:push.configured,
            updatedAt:new Date()
          }}
        );
      }

      await updates.updateOne(
        {_id:doc._id},
        {$set:{
          pushSent:push.successCount,
          pushFailed:push.failureCount,
          pushConfigured:push.configured,
          pushErrors:push.errors||[]
        }}
      );
    }

    return NextResponse.json({
      ok:true,version,versionCode,sizeMb,sizeBytes,installRequired,sendAll,pushConfigured:push.configured,
      sent:push.successCount,failed:push.failureCount,errors:push.errors||[]
    });
  }catch(error){
    console.error("[ADMIN APP UPDATE]",error);
    const message=error instanceof Error?error.message:String(error);
    const status=message==="AUTH_REQUIRED"||message==="ADMIN_REQUIRED"?401:500;
    return NextResponse.json({ok:false,error:status===401?"Unauthorized":message||"Unable to publish update."},{status});
  }
}
