"use client";
import {useEffect,useState} from "react";
type S={id:string;current:boolean;createdAt:string;lastSeenAt:string;expiresAt:string;ip:string;city:string;country:string;device:string;browser:string;platform:string};
export default function AccountSessions(){
 const[sessions,setSessions]=useState<S[]>([]),[busy,setBusy]=useState(""),[error,setError]=useState("");
 async function load(){try{const d=await fetch("/api/account/sessions",{cache:"no-store"}).then(r=>r.json());if(d.ok)setSessions(d.sessions||[]);else setError(d.error||"Unable to load sessions.");}catch{setError("Unable to load sessions.")}}
 useEffect(()=>{load()},[]);
 async function remove(id:string){setBusy(id);setError("");try{const d=await fetch("/api/account/sessions",{method:"DELETE",headers:{"Content-Type":"application/json"},body:JSON.stringify({sessionId:id})}).then(r=>r.json());if(!d.ok)setError(d.error||"Unable to sign out.");else await load()}finally{setBusy("")}}
 async function removeOthers(){setBusy("all");setError("");try{const d=await fetch("/api/account/sessions",{method:"DELETE",headers:{"Content-Type":"application/json"},body:JSON.stringify({allOther:true})}).then(r=>r.json());if(!d.ok)setError(d.error||"Unable to sign out other sessions.");else await load()}finally{setBusy("")}}
 return <section className="account-sessions-card">
  <div className="account-sessions-head"><div><span>SECURITY</span><h2>Where you're signed in</h2><p>Review active browsers and devices on your account.</p></div>{sessions.some(x=>!x.current)&&<button className="secondary-btn" onClick={removeOthers} disabled={Boolean(busy)}>Sign out other devices</button>}</div>
  {error&&<div className="error-box">{error}</div>}
  <div className="account-session-list">{sessions.map(s=><article className={"account-session-row"+(s.current?" current":"")} key={s.id}>
   <div className="account-session-icon">{s.platform==="Android"?"▣":s.platform==="iOS"?"⌁":"◉"}</div>
   <div className="account-session-main"><div><b>{s.device}</b>{s.current&&<span className="account-session-current">THIS DEVICE</span>}</div><small>{s.browser} · {s.platform}</small><small>{[s.city,s.country].filter(Boolean).join(", ")||"Location unavailable"} · {s.ip||"IP unavailable"}</small><small>Last active: {new Date(s.lastSeenAt).toLocaleString()}</small></div>
   {!s.current&&<button className="account-session-remove" disabled={busy===s.id||Boolean(busy)} onClick={()=>remove(s.id)}>{busy===s.id?"Signing out…":"Sign out"}</button>}
  </article>)}</div>
  {!sessions.length&&<div className="country-loading">No active sessions found.</div>}
 </section>;
}
