import {NextResponse} from "next/server";
import {requireAdmin,passwordHash} from "@/lib/auth";
import {collection} from "@/lib/mongo";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function POST(req:Request){
 try{
  await requireAdmin();
  const body=await req.json().catch(()=>({}));
  const userId=String(body.userId||"").trim();
  const password=String(body.password||"");
  if(!userId)return NextResponse.json({ok:false,error:"Choose a user account."},{status:400});
  if(password.length<8||password.length>128)return NextResponse.json({ok:false,error:"Password must be 8–128 characters."},{status:400});
  const users=await collection<any>("users");
  const user=await users.findOne({_id:userId},{projection:{_id:1,role:1,email:1}});
  if(!user)return NextResponse.json({ok:false,error:"User not found."},{status:404});
  if(user.role==="admin")return NextResponse.json({ok:false,error:"Primary administrator passwords cannot be changed from the user manager."},{status:403});
  await users.updateOne({_id:userId},{$set:{password_hash:await passwordHash(password),passwordChangedAt:new Date(),passwordChangedByAdmin:true}});
  await Promise.all([
   collection<any>("sessions").then(c=>c.deleteMany({userId})),
   collection<any>("loginApprovals").then(c=>c.deleteMany({userId}))
  ]);
  return NextResponse.json({ok:true,passwordChanged:true,sessionsRevoked:true});
 }catch(error){
  const message=error instanceof Error?error.message:"";
  const status=message==="AUTH_REQUIRED"||message==="ADMIN_REQUIRED"?401:500;
  return NextResponse.json({ok:false,error:status===401?"Unauthorized":"Unable to change the user's password."},{status});
 }
}
