import {NextResponse} from "next/server";
import {requireAdmin} from "@/lib/auth";
import {collection,mongoId} from "@/lib/mongo";

export const runtime="nodejs";
export const dynamic="force-dynamic";

export async function POST(req:Request){
 try{
  const admin=await requireAdmin();
  const body=await req.json().catch(()=>null);
  const userId=String(body?.userId||"").trim();
  const verified=body?.verified===true;
  if(!userId||userId.length>160)return NextResponse.json({ok:false,error:"Choose a valid user."},{status:400});
  const users=await collection<any>("users");
  const user=await users.findOne({_id:userId},{projection:{_id:1,role:1,badgeVerifiedAt:1}});
  if(!user)return NextResponse.json({ok:false,error:"User not found."},{status:404});
  if(user.role==="admin")return NextResponse.json({ok:false,error:"Administrator accounts cannot receive public verification badges."},{status:403});
  const now=new Date();
  if(verified){
   await users.updateOne({_id:userId},{$set:{badgeVerifiedAt:now,badgeVerifiedBy:String(admin.id),badgeVerifiedByEmail:String(admin.email||"")}});
  }else{
   await users.updateOne({_id:userId},{$unset:{badgeVerifiedAt:"",badgeVerifiedBy:"",badgeVerifiedByEmail:""}});
  }
  await (await collection<any>("auditLogs")).insertOne({
   _id:mongoId(),actorId:String(admin.id),action:verified?"user.badge.verify":"user.badge.revoke",
   metadata:JSON.stringify({userId,verified}),createdAt:now
  });
  return NextResponse.json({ok:true,verified,badgeVerifiedAt:verified?now:null,badgeVerifiedBy:verified?String(admin.id):null});
 }catch(error){
  const message=error instanceof Error?error.message:"";
  const status=message==="AUTH_REQUIRED"||message==="ADMIN_REQUIRED"?401:500;
  return NextResponse.json({ok:false,error:status===401?"Unauthorized":"Unable to update verification badge."},{status});
 }
}
