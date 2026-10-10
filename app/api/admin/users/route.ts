import {NextResponse} from "next/server";
import {requireAdmin} from "@/lib/auth";
import {collection} from "@/lib/mongo";

export const runtime="nodejs";
export const dynamic="force-dynamic";

export async function GET(){
 try{
  await requireAdmin();
  const rows=await (await collection<any>("users")).find({}, {projection:{password_hash:0}}).sort({coins:-1,createdAt:-1}).limit(500).toArray();
  return NextResponse.json({ok:true,users:rows.map(u=>({
   id:String(u._id),email:u.email,name:u.name,role:u.role,coins:Number(u.coins||0),
   verified_at:u.verifiedAt||null,created_at:u.createdAt
  }))},{headers:{"Cache-Control":"no-store"}});
 }catch{return NextResponse.json({ok:false,error:"Unauthorized"},{status:401})}
}

export async function DELETE(req:Request){
 try{
  await requireAdmin();
  const body=await req.json().catch(()=>null);
  const id=String(body?.userId||"").trim();
  if(!id)return NextResponse.json({ok:false,error:"Choose a user to delete."},{status:400});
  const users=await collection<any>("users");
  const user=await users.findOne({_id:id},{projection:{_id:1,role:1,email:1}});
  if(!user)return NextResponse.json({ok:false,error:"User not found."},{status:404});
  if(user.role==="admin")return NextResponse.json({ok:false,error:"Administrator accounts are protected from deletion."},{status:403});

  // Remove authentication and device records so a deleted account cannot
  // continue using old sessions, API credentials or push-token associations.
  await Promise.all([
   collection<any>("sessions").then(c=>c.deleteMany({userId:id})),
   collection<any>("emailTokens").then(c=>c.deleteMany({userId:id})),
   collection<any>("apiKeys").then(c=>c.deleteMany({userId:id})),
   collection<any>("deviceTokens").then(c=>c.deleteMany({userId:id})),
   collection<any>("notifications").then(c=>c.deleteMany({userId:id})),
   collection<any>("loginApprovals").then(c=>c.deleteMany({userId:id}))
  ]);
  await users.deleteOne({_id:id});
  return NextResponse.json({ok:true,deleted:true,email:String(user.email||"")});
 }catch(error){
  const message=error instanceof Error?error.message:"";
  const status=message==="AUTH_REQUIRED"||message==="ADMIN_REQUIRED"?401:500;
  console.error("[ADMIN USER DELETE]",message);
  return NextResponse.json({ok:false,error:status===401?"Unauthorized":"Unable to delete user."},{status});
 }
}
