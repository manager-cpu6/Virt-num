import {NextResponse} from "next/server";
import {requireUser} from "@/lib/auth";
import {ensureApiKey,listApiKeys,revokeApiKey} from "@/lib/api-key";
export const runtime="nodejs";
export const dynamic="force-dynamic";

export async function GET(){
 try{
  const u=await requireUser(),ensured=await ensureApiKey(u.id);
  return NextResponse.json({ok:true,key:ensured.raw,keyCreated:ensured.created,keys:await listApiKeys(u.id)});
 }catch{return NextResponse.json({ok:false,error:"Please sign in."},{status:401})}
}

export async function POST(){
 return NextResponse.json({ok:false,error:"API keys are created automatically for every account. Manual creation is disabled."},{status:405});
}

export async function DELETE(req:Request){
 try{
  const u=await requireUser(),id=new URL(req.url).searchParams.get("id")||"";
  if(!id)return NextResponse.json({ok:false,error:"Key id is required."},{status:400});
  const revoked=await revokeApiKey(u.id,id);
  if(!revoked)return NextResponse.json({ok:false,error:"API key was already revoked or was not found."},{status:404});
  const replacement=await ensureApiKey(u.id);
  return NextResponse.json({
   ok:true,revoked:true,key:replacement.raw,keyCreated:true,
   message:"Old API key revoked. A new production API key was generated automatically.",
   keys:await listApiKeys(u.id)
  });
 }catch{return NextResponse.json({ok:false,error:"Unable to revoke API key."},{status:401})}
}
