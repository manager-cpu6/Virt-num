"use client";
import {useEffect,useState} from "react";
import {useRouter,useSearchParams} from "next/navigation";
export default function LoginApprovalPage(){
 const params=useSearchParams(),router=useRouter(),[a,setA]=useState<any>(null),[error,setError]=useState(""),[busy,setBusy]=useState(false);
 const id=params.get("approvalId")||"";
 useEffect(()=>{if(!id)return;fetch("/api/auth/login/approval?id="+encodeURIComponent(id),{cache:"no-store"}).then(r=>r.json()).then(d=>{if(d.ok)setA(d.approval);else setError(d.error||"Request not found.")}).catch(()=>setError("Unable to load the request."))},[id]);
 async function answer(approve:boolean){setBusy(true);try{const d=await fetch("/api/auth/login/approval",{method:"POST",headers:{"Content-Type":"application/json"},credentials:"include",body:JSON.stringify({approvalId:id,approve})}).then(r=>r.json());if(!d.ok){setError(d.error||"Unable to respond.");return}router.replace("/account")}catch{setError("Unable to respond to this login request.")}finally{setBusy(false)}}
 return <main className="auth-page"><div className="brand-mark">N</div><span className="eyebrow">ACCOUNT SECURITY</span><h1>Is this you?</h1>{a?<div className="form-card"><p>A browser is requesting access to your Numelixa account.</p><div className="security-approval-card"><b>{a.device||"Browser"}</b><span>{a.browser||"Browser"} · {a.platform||""}</span><span>{a.city||"Location unavailable"}{a.country?", "+a.country:""}</span><small>Requested {new Date(a.createdAt).toLocaleString()}</small></div><button className="primary-btn full" disabled={busy||a.status!=="pending"} onClick={()=>answer(true)}>Yes, it's me <span>✓</span></button><button className="secondary-btn full" disabled={busy||a.status!=="pending"} onClick={()=>answer(false)}>No, deny login <span>×</span></button></div>:<div className="form-card">{error&&<div className="error-box">{error}</div>}<p>{error||"Loading secure login request…"}</p></div>}</main>;
}
