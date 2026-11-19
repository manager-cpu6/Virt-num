"use client";
import {useEffect,useState} from "react";

type Settings={websiteEnabled:boolean;appEnabled:boolean;message:string;updatedAt?:string|null;updatedBy?:string|null};
const defaults:Settings={websiteEnabled:false,appEnabled:false,message:"Numelixa is temporarily under maintenance. Please check back soon."};

export default function AdminSystemMaintenance(){
 const [settings,setSettings]=useState<Settings>(defaults);
 const [busy,setBusy]=useState(false);
 const [error,setError]=useState("");
 const [saved,setSaved]=useState("");
 async function load(){
  try{const r=await fetch("/api/admin/system-maintenance",{cache:"no-store"});const d=await r.json();if(!r.ok||!d.ok)throw new Error(d.error||"Unable to load maintenance settings.");setSettings({...defaults,...d.settings});}
  catch(e){setError(e instanceof Error?e.message:"Unable to load maintenance settings.");}
 }
 useEffect(()=>{void load()},[]);
 async function save(next:Settings){
  setBusy(true);setError("");setSaved("");
  try{const r=await fetch("/api/admin/system-maintenance",{method:"POST",headers:{"Content-Type":"application/json"},credentials:"include",body:JSON.stringify(next)});const d=await r.json();if(!r.ok||!d.ok)throw new Error(d.error||"Unable to save maintenance settings.");setSettings({...defaults,...d.settings});setSaved("Maintenance settings saved and are now active.");}
  catch(e){setError(e instanceof Error?e.message:"Unable to save maintenance settings.");}
  finally{setBusy(false)}
 }
 const both=settings.websiteEnabled&&settings.appEnabled;
 return <div className="admin-notifications">
  <section className="admin-card">
   <span className="eyebrow">GLOBAL SERVICE CONTROL</span>
   <h2>Website & App Maintenance</h2>
   <p className="admin-help">Control each platform independently. When App maintenance is active, the app is blocked from normal use and shows only the Help Team Chat entry. The official APK download host remains available. Admin routes remain accessible so you can turn maintenance off.</p>
   <div className="admin-app-version-grid">
    <article className="admin-app-version-card"><div><b>Website</b><span>numelixa.com and customer web pages</span></div><strong>{settings.websiteEnabled?"ON":"OFF"}</strong><small>{settings.websiteEnabled?"Visitors see the maintenance page.":"Website remains available."}</small><button className={settings.websiteEnabled?"secondary-btn":"primary-btn"} disabled={busy} onClick={()=>save({...settings,websiteEnabled:!settings.websiteEnabled})}>{settings.websiteEnabled?"Disable website maintenance":"Enable website maintenance"}</button></article>
    <article className="admin-app-version-card"><div><b>Android App</b><span>Numelixa native Android application</span></div><strong>{settings.appEnabled?"ON":"OFF"}</strong><small>{settings.appEnabled?"Normal app screens are blocked; Help Team Chat remains available.":"App remains available."}</small><button className={settings.appEnabled?"secondary-btn":"primary-btn"} disabled={busy} onClick={()=>save({...settings,appEnabled:!settings.appEnabled})}>{settings.appEnabled?"Disable app maintenance":"Enable app maintenance"}</button></article>
   </div>
   <div className="admin-form" style={{marginTop:18}}>
    <label>Maintenance message<textarea rows={3} maxLength={240} value={settings.message} onChange={e=>setSettings(s=>({...s,message:e.target.value}))}/></label>
    <button className="primary-btn" disabled={busy} onClick={()=>save(settings)}>{busy?"Saving…":"Save maintenance message"}</button>
   </div>
   {error&&<div className="error-box">{error}</div>}{saved&&<div className="success-box">{saved}</div>}
   <div className="admin-help" style={{marginTop:12}}>Current mode: {both?"Website + App":settings.websiteEnabled?"Website only":settings.appEnabled?"App only":"All services online"}.</div>
  </section>
 </div>;
}
