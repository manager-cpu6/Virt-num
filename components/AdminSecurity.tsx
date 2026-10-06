"use client";
import {useEffect,useState} from "react";
export default function AdminSecurity(){
 const[mode,setMode]=useState<"normal"|"extra">("normal"),[busy,setBusy]=useState(false),[msg,setMsg]=useState("");
 useEffect(()=>{fetch("/api/admin/security",{cache:"no-store"}).then(r=>r.json()).then(d=>{if(d.ok)setMode(d.mode)}).catch(()=>{})},[]);
 async function change(next:"normal"|"extra"){setBusy(true);setMsg("");try{const d=await fetch("/api/admin/security",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({mode:next})}).then(r=>r.json());if(!d.ok){setMsg(d.error||"Unable to update security.");return}setMode(next);setMsg(next==="extra"?"Extra security is now active. Browser logins require approval in the Numelixa Android app.":"Normal security is active. Login uses email and password only.");}finally{setBusy(false)}}
 return <div className="admin-two-col">
  <div className="admin-card"><h2>Login security</h2>
   <div className="security-mode-card"><div><b>Normal security</b><small>Email + password. No mobile approval is required.</small></div><button className={mode==="normal"?"primary-btn":"secondary-btn"} disabled={busy} onClick={()=>change("normal")}>{mode==="normal"?"OPEN":"Open Normal security"}</button></div>
   <div className="security-mode-card"><div><b>Extra security</b><small>When the account is already signed in on Numelixa Android, browser login requires a mobile approval.</small></div><button className={mode==="extra"?"primary-btn":"secondary-btn"} disabled={busy} onClick={()=>change("extra")}>{mode==="extra"?"OPEN":"Open Extra security"}</button></div>
   {msg&&<div className="success-box">{msg}</div>}
  </div>
  <div className="admin-card"><h2>How Extra security works</h2><ol className="security-steps"><li>User enters the correct email and password in a browser.</li><li>Numelixa sends a high-priority push to the user's registered Android device.</li><li>The app shows the browser device, browser and approximate IP location.</li><li>User chooses <b>Yes, it's me</b> or <b>No, deny login</b>.</li><li>Only an approved request can create the browser session. Requests expire automatically.</li></ol><p className="admin-help">Location is approximate city/country information derived from the connection IP; it is not precise GPS.</p></div>
 </div>;
}
