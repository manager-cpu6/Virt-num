"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
import {useRouter} from "next/navigation";

export default function Login(){
 const[email,setEmail]=useState(""),[secret,setSecret]=useState(""),[error,setError]=useState(""),[loading,setLoading]=useState(false),[next,setNext]=useState(""),[approval,setApproval]=useState<any>(null),router=useRouter();
 useEffect(()=>{setNext(new URLSearchParams(window.location.search).get("next")||"")},[]);

 async function finishApproved(id:string){
  const d=await fetch("/api/auth/login/approval",{method:"PUT",headers:{"Content-Type":"application/json"},credentials:"include",body:JSON.stringify({approvalId:id})}).then(x=>x.json());
  if(!d.ok)throw new Error(d.error||"Unable to complete login.");
  window.dispatchEvent(new Event("numelixa-auth-ready"));router.push(next&&next.startsWith("/")?next:"/");
 }

 async function go(){
  setError("");if(!email.trim()||!secret){setError("Enter your email and password.");return}setLoading(true);
  try{
   const d=await fetch("/api/auth/login",{method:"POST",headers:{"Content-Type":"application/json"},credentials:"include",body:JSON.stringify({email,password:secret})}).then(x=>x.json());
   if(d.approvalRequired){setApproval(d);setLoading(false);return}
   if(!d.ok){setError(d.error||"Login failed");return}
   window.dispatchEvent(new Event("numelixa-auth-ready"));router.push(next&&next.startsWith("/")?next:"/");
  }catch{setError("Unable to contact Numelixa. Please try again.")}finally{setLoading(false)}
 }

 useEffect(()=>{
  if(!approval?.approvalId)return;
  let stopped=false;
  const timer=window.setInterval(async()=>{
   try{
    const d=await fetch("/api/auth/login/approval?id="+encodeURIComponent(approval.approvalId),{cache:"no-store"}).then(x=>x.json());
    if(stopped)return;
    const a=d.approval;
    if(a?.status==="approved"){stopped=true;window.clearInterval(timer);await finishApproved(approval.approvalId)}
    else if(a?.status==="denied"||a?.status==="expired"){stopped=true;window.clearInterval(timer);setApproval(null);setError(a.status==="expired"?"The approval request expired. Please sign in again.":"Login was not approved on your Numelixa app.")}
   }catch{}
  },1800);
  return()=>{stopped=true;window.clearInterval(timer)};
 },[approval?.approvalId]);

 if(approval)return <div className="auth-page"><div className="brand-mark">N</div><span className="eyebrow">EXTRA SECURITY</span><h1>Approve your login</h1><p>We sent a secure approval request to your Numelixa Android app.</p><div className="form-card"><div className="security-approval-card"><b>New browser login</b><span>{approval.device||"Browser"} · {approval.city||"Location unavailable"}{approval.country?", "+approval.country:""}</span><small>Open Numelixa on your phone and choose <b>Yes, it's me</b> to continue.</small></div><div className="approval-waiting">Waiting for approval…</div><button className="secondary-btn full" onClick={()=>setApproval(null)}>Cancel</button></div></div>;

 return <div className="auth-page"><div className="brand-mark">N</div><h1>Welcome back</h1><p>Sign in to manage your numbers and wallet.</p><div className="form-card"><label>Email<input value={email} onChange={x=>setEmail(x.target.value)} type="email" autoComplete="email" placeholder="you@example.com"/></label><label>Password<input value={secret} onChange={x=>setSecret(x.target.value)} type="password" autoComplete="current-password"/></label>{error&&<div className="error-box">{error}</div>}<button className="primary-btn full" onClick={go} disabled={loading}>{loading?"Signing in…":"Sign in"}</button><Link className="text-link" href="/forgot-password">Forgot password?</Link></div><p>New here? <Link className="text-link" href="/signup">Create account</Link></p></div>
}
