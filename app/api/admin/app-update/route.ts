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
      id:String(x._id),version:x.version,sizeMb:x.sizeMb,apkUrl:x.apkUrl,
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
    const sizeMb=Number(body.sizeMb);
    const force=Boolean(body.force);
    const sendAll=body.sendAll!==false;

    if(!version||!apkUrl||!Number.isFinite(sizeMb)||sizeMb<=0)
      return NextResponse.json({ok:false,error:"Version, APK URL and valid APK size are required."},{status:400});

    if(!/^https:\/\//i.test(apkUrl))
      return NextResponse.json({ok:false,error:"APK URL must use HTTPS."},{status:400});

    const now=new Date();
    const doc={
      _id:mongoId(),version,sizeMb,apkUrl,releaseNotes,force,published:true,
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
      ok:true,version,sizeMb,sendAll,pushConfigured:push.configured,
      sent:push.successCount,failed:push.failureCount
    });
  }catch(error){
    console.error("[ADMIN APP UPDATE]",error);
    const message=error instanceof Error?error.message:String(error);
    const status=message==="AUTH_REQUIRED"||message==="ADMIN_REQUIRED"?401:500;
    return NextResponse.json({ok:false,error:status===401?"Unauthorized":"Unable to publish update."},{status});
  }
}
