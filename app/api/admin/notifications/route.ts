import {NextResponse} from "next/server";
import {cookies} from "next/headers";
import {requireAdmin} from "@/lib/auth";
import {collection,mongoId} from "@/lib/mongo";
import {sendPush,isFirebaseConfigured} from "@/lib/push";

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
   serverPushConfigured:isFirebaseConfigured()
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
  const admin=await requireAdmin();
  const body=await req.json().catch(()=>null);
  if(!body)return NextResponse.json({ok:false,error:"Invalid JSON body."},{status:400});

  if(String(body.action||"")==="test_current_device"){
   const devices=await collection<any>("deviceTokens");
   const adminId=String(admin.id||"").trim();
   const rows=adminId
    ?await devices.find({userId:adminId},{projection:{token:1,platform:1,updatedAt:1,lastSeenAt:1}}).sort({updatedAt:-1}).toArray()
    :[];
   const tokens=[...new Set(rows.map(x=>String(x.token||"").trim()).filter(x=>x.length>=20))];

   // The admin dashboard is normally opened in a browser, while the push
   // token belongs to the Android app session. Therefore the test must target
   // the admin account's linked Android device(s), not a browser cookie.
   if(!tokens.length){
    return NextResponse.json({
     ok:false,
     error:"No Android push device is linked to the admin account. Open Numelixa on the Android device, sign in to the admin account, and allow notifications."
    },{status:400});
   }

   const test=await sendPush(
    tokens,
    "🔔 Numelixa notification test",
    "Native push is working on this Android device.",
    {type:"push_test",url:"/"}
   );

   if(test.invalidTokens?.length){
    await devices.deleteMany({token:{$in:test.invalidTokens}});
   }

   return NextResponse.json({
    ok:test.successCount>0,
    sent:test.successCount,
    failed:test.failureCount,
    devices:tokens.length,
    configured:test.configured,
    errors:test.errors||[],
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
  const status=message==="AUTH_REQUIRED"||message==="ADMIN_REQUIRED"?401:message.startsWith("MongoDB is not configured")?503:500;
  return NextResponse.json({
   ok:false,
   error:status===401?"Unauthorized":status===503?"Server database is not configured. Add MONGODB_URI in Vercel and redeploy.":"Notification send failed. Check the server logs."
  },{status});
 }
}
