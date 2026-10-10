import {NextResponse} from "next/server";
import {requireAdmin} from "@/lib/auth";
import {collection} from "@/lib/mongo";
export const dynamic="force-dynamic";
export async function GET(){
 try{
  await requireAdmin();
  const r=await (await collection<any>("users")).find({}, {projection:{password_hash:0}}).sort({coins:-1,createdAt:-1}).limit(500).toArray();
  return NextResponse.json({ok:true,users:r.map(u=>({id:String(u._id),email:u.email,name:u.name,role:u.role,coins:Number(u.coins||0),verified_at:u.verifiedAt||null,created_at:u.createdAt}))});
 }catch{return NextResponse.json({ok:false,error:"Unauthorized"},{status:401})}
}
export async function DELETE(req:Request){
 try{
  const admin=await requireAdmin();
  const body=await req.json();
  const userId=String(body.userId||"").trim();
  if(!userId)return NextResponse.json({ok:false,error:"Choose a user to delete."},{status:400});
  if(userId===String(admin.id))return NextResponse.json({ok:false,error:"You cannot delete your own administrator account."},{status:400});
  const users=await collection<any>("users");
  const target=await users.findOne({_id:userId});
  if(!target)return NextResponse.json({ok:false,error:"User not found."},{status:404});
  if(target.role==="admin")return NextResponse.json({ok:false,error:"Administrator accounts cannot be deleted from this screen."},{status:403});
  await users.deleteOne({_id:target._id});
  const id=String(target._id);
  await Promise.all([
   collection<any>("sessions").then(c=>c.deleteMany({userId:id})),
   collection<any>("emailTokens").then(c=>c.deleteMany({userId:id})),
   collection<any>("apiKeys").then(c=>c.deleteMany({userId:id})),
   collection<any>("loginApprovals").then(c=>c.deleteMany({userId:id})),
   collection<any>("deviceTokens").then(c=>c.updateMany({userId:id},{$set:{userId:null,updatedAt:new Date()}}))
  ]);
  return NextResponse.json({ok:true,deleted:true,email:target.email});
 }catch(e){
  const message=e instanceof Error?e.message:"Unable to delete user.";
  return NextResponse.json({ok:false,error:message==="ADMIN_REQUIRED"||message==="AUTH_REQUIRED"?"Unauthorized":message},{status:message==="ADMIN_REQUIRED"||message==="AUTH_REQUIRED"?401:500});
 }
}
