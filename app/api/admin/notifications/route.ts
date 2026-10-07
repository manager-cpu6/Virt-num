import {NextResponse} from "next/server";
import {cookies} from "next/headers";
import {requireAdmin} from "@/lib/auth";
import {collection,mongoId} from "@/lib/mongo";
import {sendPush} from "@/lib/push";

export const runtime="nodejs";
export const dynamic="force-dynamic";

export async function GET(){
 try{
  await requireAdmin();
  const devices=await collection<any>("deviceTokens");
  const deviceCount=await devices.countDocuments({});
  const linkedDeviceCount=await devices.countDocuments({userId:{$type:"string",$ne:""}});
  const unlinkedDeviceCount=Math.max(0,deviceCount-linkedDeviceCount);
  const rows=await (await collection<any>("notifications"))
   .find({adminSent:true}).sort({createdAt:-1}).limit(50).toArray();

  return NextResponse.json({
   ok:true,
   notifications:rows.map(x=>({
    id:String(x._id),title:x.title,message:x.message,target:x.target,
    createdAt:x.createdAt,sentCount:Number(x.sentCount||0),
    pushConfigured:Boolean(x.pushConfigured)
   })),
   deviceCount,
   linkedDeviceCount,
   unlinkedDeviceCount,
   serverPushConfigured:Boolean(
    process.env.FIREBASE_SERVICE_ACCOUNT_JSON||
    process.env.FIREBASE_SERVICE_ACCOUNT||
    (process.env.FIREBASE_PROJECT_ID&&process.env.FIREBASE_CLIENT_EMAIL&&process.env.FIREBASE_PRIVATE_KEY)
   )
  },{headers:{"Cache-Control":"no-store"}});
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
  const body=await req.json().catch(()=>null);
  if(!body)return NextResponse.json({ok:false,error:"Invalid JSON body."},{status:400});

  if(String(body.action||"")==="test_current_device"){
   const token=String((await cookies()).get("numelixa_device_token")?.value||"").trim();
   if(token.length<20){
    return NextResponse.json({
     ok:false,
     error:"This admin device has no registered native push token. Open the Android app while signed in and allow notifications."
    },{status:400});
   }
   const test=await sendPush(
    [token],
    "🔔 Numelixa notification test",
    "Native push is working on this Android device.",
    {type:"push_test",url:"/"}
   );
   if(test.invalidTokens?.length){
    await (await collection<any>("deviceTokens")).deleteMany({token:{$in:test.invalidTokens}});
   }
   return NextResponse.json({
    ok:test.successCount>0,
    sent:test.successCount,
    failed:test.failureCount,
    configured:test.configured,
    error:test.errors?.[0]?.message||null
   });
  }

  const title=String(body.title||"").trim().slice(0,80);
  const message=String(body.message||"").trim().slice(0,500);
  const target=String(body.target||"all").trim();

  if(!title||!message)
   return NextResponse.json({ok:false,error:"Title and message are required."},{status:400});

  if(target!=="all"&&!target.startsWith("user:"))
   return NextResponse.json({ok:false,error:"Invalid notification audience."},{status:400});

  const users=await collection<any>("users");
  const userIds=target==="all"
   // "All users" means every real account. Do not require a particular
   // email shape here; deviceTokens are the final push target filter.
   ?await users.find({},{projection:{_id:1}}).toArray()
   :await users.findOne({_id:target.slice(5)},{projection:{_id:1}}).then(u=>u?[u]:[]);

  if(!userIds.length)
   return NextResponse.json({ok:false,error:"No target users found."},{status:404});

  const ids=userIds.map(u=>String(u._id));
  const notificationsCollection=await collection<any>("notifications");
  const notifications=userIds.map(u=>({
   _id:mongoId(),userId:String(u._id),title,message,adminSent:true,target,
   createdAt:new Date(),readAt:null,sentCount:0,pushConfigured:false
  }));
  await notificationsCollection.insertMany(notifications);

  const deviceRows=await (await collection<any>("deviceTokens"))
   .find({userId:{$in:ids}}).toArray();

  let pushResult:Awaited<ReturnType<typeof sendPush>>={
   configured:false,successCount:0,failureCount:0,invalidTokens:[],errors:[]
  };
  let pushError:string|null=null;

  try{
   pushResult=await sendPush(deviceRows.map(x=>String(x.token||"")),title,message);
  }catch(error){
   pushError=error instanceof Error?error.message:String(error);
   console.error("[ADMIN NOTIFICATIONS PUSH]",pushError);
  }

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
    pushError,
    updatedAt:new Date()
   }}
  );

  return NextResponse.json({
   ok:true,recipients:ids.length,devices:deviceRows.length,
   sent:pushResult.successCount,failed:pushResult.failureCount,
   pushConfigured:pushResult.configured,pushError
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
