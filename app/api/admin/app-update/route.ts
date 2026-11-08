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
      id:String(x._id),version:x.version,versionCode:Number(x.versionCode||0),sizeMb:x.sizeMb,sizeBytes:Number(x.sizeBytes||0),sha256:String(x.sha256||""),apkUrl:x.apkUrl,
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
    const versionCode=Number(version.match(/\+(\d+)$/)?.[1]||0);
    const sha256=String(body.sha256||"").trim().toLowerCase();
    const apkUrl=String(body.apkUrl||"").trim();
    const releaseNotes=String(body.releaseNotes||"").trim().slice(0,1200);
    
    const force=Boolean(body.force);
    const sendAll=body.sendAll!==false;

    if(!/^\d+\.\d+\.\d+\+\d+$/.test(version)||!versionCode)
      return NextResponse.json({ok:false,error:"Enter the full app version including build number, for example 1.0.12+13."},{status:400});
    if(!apkUrl) return NextResponse.json({ok:false,error:"APK URL is required."},{status:400});
    if(sha256&&!/^[a-f0-9]{64}$/.test(sha256))
      return NextResponse.json({ok:false,error:"SHA-256 must contain exactly 64 hexadecimal characters."},{status:400});

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
    if(!Number.isFinite(sizeBytes)||sizeBytes<=0)
      return NextResponse.json({ok:false,error:"Unable to detect the exact APK file size. Check the APK URL and try again."},{status:400});
    const sizeMb=Number((sizeBytes/(1024*1024)).toFixed(2));
    const now=new Date();
    const doc={
      _id:mongoId(),version,versionCode,sizeMb,sizeBytes,apkUrl,releaseNotes,sha256,force,published:true,
      publishedAt:now,createdAt:now,pushSent:0,pushFailed:0
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
      ok:true,version,sizeMb,sizeBytes,sendAll,pushConfigured:push.configured,
      sent:push.successCount,failed:push.failureCount
    });
  }catch(error){
    console.error("[ADMIN APP UPDATE]",error);
    const message=error instanceof Error?error.message:String(error);
    const status=message==="AUTH_REQUIRED"||message==="ADMIN_REQUIRED"?401:500;
    return NextResponse.json({ok:false,error:status===401?"Unauthorized":"Unable to publish update."},{status});
  }
}
