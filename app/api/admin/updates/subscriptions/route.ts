import {NextResponse} from "next/server";
import {requireAdmin} from "@/lib/auth";
import {collection} from "@/lib/mongo";
export const runtime="nodejs";
export const dynamic="force-dynamic";
export async function GET(req:Request){
 try{
  await requireAdmin();
  const channelId=String(new URL(req.url).searchParams.get("channelId")||"").trim();
  if(!channelId)return NextResponse.json({ok:false,error:"Channel ID is required."},{status:400});
  const rows=await (await collection<any>("updateSubscriptions")).find({channelId}).sort({joinedAt:-1}).limit(500).toArray();
  const ids=rows.map(x=>String(x.userId));
  const users=ids.length?await (await collection<any>("users")).find({_id:{$in:ids}},{projection:{_id:1,name:1,email:1,publicId:1}}).toArray():[];
  const map=new Map(users.map(u=>[String(u._id),u]));
  return NextResponse.json({ok:true,members:rows.map(m=>{const u=map.get(String(m.userId));return {userId:String(m.userId),name:String(u?.name||"Numelixa user"),email:String(u?.email||""),publicId:String(u?.publicId||""),joinedAt:m.joinedAt||null,notificationsEnabled:m.notificationsEnabled!==false};})},{headers:{"Cache-Control":"no-store"}});
 }catch(error){
  const message=error instanceof Error?error.message:"";
  const status=message==="AUTH_REQUIRED"||message==="ADMIN_REQUIRED"?401:500;
  return NextResponse.json({ok:false,error:status===401?"Unauthorized":"Unable to load channel members."},{status});
 }
}
export async function DELETE(req:Request){
 try{
  await requireAdmin();
  const body=await req.json().catch(()=>null),channelId=String(body?.channelId||"").trim(),userId=String(body?.userId||"").trim();
  if(!channelId||!userId)return NextResponse.json({ok:false,error:"Channel and user IDs are required."},{status:400});
  const result=await (await collection<any>("updateSubscriptions")).deleteOne({channelId,userId});
  return NextResponse.json({ok:true,removed:result.deletedCount===1});
 }catch(error){
  const message=error instanceof Error?error.message:"";
  const status=message==="AUTH_REQUIRED"||message==="ADMIN_REQUIRED"?401:500;
  return NextResponse.json({ok:false,error:status===401?"Unauthorized":"Unable to remove channel member."},{status});
 }
}
