import {NextResponse} from "next/server";
import {requireAdmin} from "@/lib/auth";
import {collection,mongoId} from "@/lib/mongo";
import {sendPush, type PushSendResult} from "@/lib/push";

export const runtime="nodejs";
export const dynamic="force-dynamic";

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
    const apkUrl=String(body.apkUrl||"").trim();
    const releaseNotes=String(body.releaseNotes||"").trim().slice(0,1200);
    const manualSizeMb=Number(body.sizeMb||0);
    const versionCode=Number(body.versionCode||0);
    
    const installRequired=Boolean(body.installRequired);
    // Hard install updates are the only updates that can block the app.
    // Keep legacy force=true records compatible with the install-required behavior.
    const force=installRequired || Boolean(body.force);
    const sendAll=body.sendAll!==false;

    if(!version||!apkUrl)
      return NextResponse.json({ok:false,error:"Version and APK URL are required."},{status:400});

    if(!/^https:\/\//i.test(apkUrl))
      return NextResponse.json({ok:false,error:"APK URL must use HTTPS."},{status:400});

    const sizeResponse=await fetch(apkUrl,{method:"HEAD",redirect:"follow",cache:"no-store"});
    let sizeBytes=Number(sizeResponse.headers.get("content-length")||0);
    if(!Number.isFinite(sizeBytes)||sizeBytes<=0){
      const rangeResponse=await fetch(apkUrl,{method:"GET",headers:{Range:"bytes=0-0"},redirect:"follow",cache:"no-store"});
      const contentRange=rangeResponse.headers.get("content-range")||"";
      const match=contentRange.match(/\/([0-9]+)$/);
      sizeBytes=match?Number(match[1]):Number(rangeResponse.headers.get("content-length")||0);
      try{await rangeResponse.body?.cancel();}catch{}
    }
    if((!Number.isFinite(sizeBytes)||sizeBytes<=0)&&manualSizeMb<=0)
      return NextResponse.json({ok:false,error:"Unable to detect the exact APK file size. Enter APK size in MB manually or check the APK URL and try again."},{status:400});
    const sizeMb=manualSizeMb>0
      ?Number(manualSizeMb.toFixed(2))
      :Number((sizeBytes/(1024*1024)).toFixed(2));
    if(manualSizeMb>0) sizeBytes=Math.round(manualSizeMb*1024*1024);
    const now=new Date();
    const targetCreatedBefore=force?now:null;
    const doc={
      _id:mongoId(),releaseId:mongoId(),version,versionCode,sizeMb,sizeBytes,apkUrl,releaseNotes,installRequired,force,published:true,
      publishedAt:now,createdAt:now,targetCreatedBefore,pushSent:0,pushFailed:0
    };
    const updates=await collection<any>("appUpdates");
    await updates.updateMany({published:true},{$set:{published:false}});
    await updates.insertOne(doc);

    let push:PushSendResult={configured:false,successCount:0,failureCount:0,invalidTokens:[],errors:[]};
    if(sendAll){
      const devices=await (await collection<any>("deviceTokens")).find({}).toArray();
      push=await sendPush(
        devices.map(x=>String(x.token||"")),
        "🚀 New Numelixa update",
        "Version "+version+" is ready. Update now for the latest Numelixa experience.",
        {url:"/account?update=1",type:"app_update",version}
      );
      if(push.invalidTokens?.length){
        await (await collection<any>("deviceTokens")).deleteMany({token:{$in:push.invalidTokens}});
      }
      await updates.updateOne({_id:doc._id},{$set:{pushSent:push.successCount,pushFailed:push.failureCount}});
    }

    return NextResponse.json({
      ok:true,version,versionCode,sizeMb,sizeBytes,installRequired,sendAll,pushConfigured:push.configured,
      sent:push.successCount,failed:push.failureCount,errors:push.errors||[]
    });
  }catch(error){
    console.error("[ADMIN APP UPDATE]",error);
    const message=error instanceof Error?error.message:String(error);
    const status=message==="AUTH_REQUIRED"||message==="ADMIN_REQUIRED"?401:500;
    return NextResponse.json({ok:false,error:status===401?"Unauthorized":"Unable to publish update."},{status});
  }
}
