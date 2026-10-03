import {NextResponse} from "next/server";
import {requireUser} from "@/lib/auth";
import {ensureApiKey,getActiveApiKeySecret,listApiKeys,revokeApiKey} from "@/lib/api-key";
export const runtime="nodejs";
export const dynamic="force-dynamic";

export async function GET(req:Request){
 try{
  const u=await requireUser();
  const url=new URL(req.url);
  const reveal=url.searchParams.get("reveal")==="1";
  const ensured=await ensureApiKey(u.id);
  if(reveal){
   const key=await getActiveApiKeySecret(u.id);
   if(!key)return NextResponse.json({ok:false,error:"Please revoke & replace this older key once to enable secure copy."},{status:409});
   return NextResponse.json({ok:true,key});
  }
  return NextResponse.json({ok:true,key:ensured.raw,keyCreated:ensured.created,keys:await listApiKeys(u.id)});
 }catch(e){if(e instanceof Error && e.message==="AUTH_REQUIRED")return NextResponse.json({ok:false,error:"Please sign in."},{status:401});console.error("[DEVELOPER KEY GET]",e);return NextResponse.json({ok:false,error:"Unable to load API key right now."},{status:500})}
}

export async function POST(){
 return NextResponse.json({ok:false,error:"API keys are created automatically for every account. Manual creation is disabled."},{status:405});
}

export async function DELETE(req:Request){
 try{
  const u=await requireUser(),id=new URL(req.url).searchParams.get("id")||"";
  if(!id)return NextResponse.json({ok:false,error:"Key id is required."},{status:400});
  const revoked=await revokeApiKey(u.id,id);
  if(!revoked){
   const current=await listApiKeys(u.id);
   const active=current.find((k:any)=>k.active);
   if(!active||String(active._id)!==id)return NextResponse.json({ok:false,error:"API key was already revoked or was not found."},{status:404});
   return NextResponse.json({ok:false,error:"The active API key could not be revoked. Please try again."},{status:409});
  }
  const replacement=await ensureApiKey(u.id);
  return NextResponse.json({
   ok:true,revoked:true,key:replacement.raw,keyCreated:true,
   message:"Old API key revoked. A new production API key was generated automatically.",
   keys:await listApiKeys(u.id)
  });
 }catch{return NextResponse.json({ok:false,error:"Unable to revoke API key."},{status:401})}
}
