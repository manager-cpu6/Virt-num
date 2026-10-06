import {NextResponse} from "next/server";
import {requireUser,createSession,requestMeta} from "@/lib/auth";
import {getLoginApproval,resolveLoginApproval} from "@/lib/login-security";

export const runtime="nodejs";export const dynamic="force-dynamic";

export async function GET(req:Request){
 try{
  const id=new URL(req.url).searchParams.get("id")||"";
  if(!id)return NextResponse.json({ok:false,error:"Approval ID is required."},{status:400});
  const approval=await getLoginApproval(id);
  if(!approval)return NextResponse.json({ok:false,error:"Login request not found."},{status:404});
  return NextResponse.json({ok:true,approval});
 }catch{return NextResponse.json({ok:false,error:"Unable to read login request."},{status:500})}
}

export async function POST(req:Request){
 try{
  const u=await requireUser();
  const body=await req.json().catch(()=>({}));
  const id=String(body.approvalId||"");
  const approve=body.approve===true;
  if(!id)return NextResponse.json({ok:false,error:"Approval ID is required."},{status:400});
  const approval=await getLoginApproval(id);
  if(!approval)return NextResponse.json({ok:false,error:"Login request not found."},{status:404});

  const resolved=await resolveLoginApproval(id,approve);
  if(!resolved.ok)return NextResponse.json({ok:false,status:resolved.status,error:"This login request has expired or was already resolved."},{status:409});
  if(resolved.userId!==String(u.id))return NextResponse.json({ok:false,error:"This login request belongs to another account."},{status:403});

  return NextResponse.json({ok:true,status:resolved.status});
 }catch(e){
  const m=e instanceof Error?e.message:"";
  return NextResponse.json({ok:false,error:m==="AUTH_REQUIRED"?"Sign in to Numelixa on this device first.":"Unable to resolve login request."},{status:m==="AUTH_REQUIRED"?401:500});
 }
}

export async function PUT(req:Request){
 try{
  const body=await req.json().catch(()=>({}));
  const id=String(body.approvalId||"");
  if(!id)return NextResponse.json({ok:false,error:"Approval ID is required."},{status:400});
  const approval=await getLoginApproval(id);
  if(!approval||approval.status!=="approved")return NextResponse.json({ok:false,status:approval?.status||"not_found"},{status:409});

  const approvals=await import("@/lib/mongo").then(x=>x.collection<any>("loginApprovals"));
  const row=await approvals.findOne({approvalId:id,status:"approved"});
  if(!row)return NextResponse.json({ok:false,error:"Approval is no longer available."},{status:409});

  await createSession(String(row.userId),requestMeta(req.headers));
  await approvals.updateOne({_id:row._id},{$set:{sessionIssuedAt:new Date()}});
  const user=await import("@/lib/mongo").then(x=>x.collection<any>("users")).then(c=>c.findOne({_id:String(row.userId)}));
  return NextResponse.json({ok:true,role:user?.role||"user"});
 }catch{return NextResponse.json({ok:false,error:"Unable to complete login."},{status:500})}
}
