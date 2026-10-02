"use client";

import {Suspense,useState} from "react";
import {useSearchParams,useRouter} from "next/navigation";

function ResetForm(){
  const q=useSearchParams();
  const token=q.get("token")||"";
  const[p,setP]=useState("");
  const[e,setE]=useState("");
  const r=useRouter();

  async function go(){
    const d=await fetch("/api/auth/reset",{
      method:"POST",
      headers:{"Content-Type":"application/json"},
      body:JSON.stringify({token,newSecret:p})
    }).then(x=>x.json());

    if(!d.ok){
      setE(d.error||"Reset failed");
      return;
    }

    r.push("/login");
  }

  return (
    <div className="form-card">
      <label>
        New password
        <input value={p} onChange={x=>setP(x.target.value)} type="password"/>
      </label>
      {e&&<div className="error-box">{e}</div>}
      <button className="primary-btn full" onClick={go}>Update password</button>
    </div>
  );
}

export default function Reset(){
  return (
    <div className="auth-page">
      <div className="brand-mark">N</div>
      <h1>Choose a new password</h1>
      <p>Set a new secure password for your account.</p>
      <Suspense fallback={<div className="form-card">Loading…</div>}>
        <ResetForm/>
      </Suspense>
    </div>
  );
}
