"use client";
import {useEffect,useState} from "react";

export default function AdminAppUpdate(){
 const[version,setVersion]=useState("");
 const[apkUrl,setApkUrl]=useState("");
 const[notes,setNotes]=useState("");
 const[force,setForce]=useState(false);
 const[sendAll,setSendAll]=useState(true);
 const[busy,setBusy]=useState(false);
 const[result,setResult]=useState("");
 const[updates,setUpdates]=useState<any[]>([]);
 const[versionUsage,setVersionUsage]=useState<any[]>([]);

 async function load(){
  try{const r=await fetch("/api/admin/app-update",{cache:"no-store"});const d=await r.json();if(d.ok){setUpdates(d.updates||[]);setVersionUsage(d.versionUsage||[])}}catch{}
 }
 useEffect(()=>{load()},[]);

 async function publish(e:React.FormEvent){
  e.preventDefault();setBusy(true);setResult("");
  try{
   const r=await fetch("/api/admin/app-update",{method:"POST",headers:{"Content-Type":"application/json"},credentials:"include",
    body:JSON.stringify({version,apkUrl,releaseNotes:notes,force,sendAll})});
   const d=await r.json();
   if(!d.ok){setResult("❌ "+(d.error||"Publish failed"));return}
   setResult(sendAll
    ?"✅ Update published and push sent to "+d.sent+" devices."
    :"✅ Update published. Users will see it in the app.");
   setVersion("");setApkUrl("");setNotes("");setForce(false);await load();
  }finally{setBusy(false)}
 }

 return <div className="admin-notifications">
  <div className="admin-card">
   <span className="eyebrow">APP INVENTORY</span>
   <h2>App Updates & installed versions</h2>
   <p className="admin-help">Version usage is counted from Android devices that have registered with Numelixa notifications. It shows registered installs and distinct accounts seen in the last 30 days; it is not a count of anonymous APK downloads.</p>
   {versionUsage.length?<div className="admin-app-version-grid">{versionUsage.map((item:any)=><article className="admin-app-version-card" key={item.platform+"-"+item.version}>
    <div><b>{item.appName||"Numelixa Android"}</b><span>{item.platform.toUpperCase()} · v{item.version}</span></div>
    <strong>{Number(item.registeredDevices||0).toLocaleString()}</strong><small>Registered devices</small>
    <div className="admin-app-version-stats"><span><b>{Number(item.registeredUsers||0).toLocaleString()}</b> Accounts</span><span><b>{Number(item.activeUsers30d||0).toLocaleString()}</b> Active · 30 days</span></div>
    <small>Last seen: {item.lastSeenAt?new Date(item.lastSeenAt).toLocaleString():"Not reported"}</small>
   </article>)}</div>:<div className="country-loading">No Android version registrations have been recorded yet.</div>}
  </div>
  <div className="notification-compose">
   <div className="notice"><span>📦</span><p>Publish an APK update. The native Numelixa app checks this automatically and detects the exact APK size automatically and shows it before updating without opening a browser.</p></div>
   <span className="eyebrow">APP UPDATE CENTER</span>
   <h2>Send new update</h2>
   <form onSubmit={publish} className="admin-form">
    <label>Version<input value={version} onChange={e=>setVersion(e.target.value)} placeholder="e.g. 1.0.12+13" required/><small>Use the complete Android version and build code. The number after + is required for older APKs to detect the update.</small></label>
        <label>APK HTTPS URL<input value={apkUrl} onChange={e=>setApkUrl(e.target.value)} type="url" placeholder="https://..." required/></label>
    <label>What's new<textarea value={notes} onChange={e=>setNotes(e.target.value)} maxLength={1200} rows={5} placeholder="Performance, notifications, fixes…"/></label>
    <label className="admin-check"><input type="checkbox" checked={force} onChange={e=>setForce(e.target.checked)}/> Required update</label>
    <label className="admin-check"><input type="checkbox" checked={sendAll} onChange={e=>setSendAll(e.target.checked)}/> Send update notification to all registered app devices</label>
    <button className="primary-btn" disabled={busy}>{busy?"Publishing…":"🚀 Publish & Send Update"}</button>
    {result&&<div className="success-box">{result}</div>}
   </form>
  </div>
  <div className="admin-card"><h2>Update history</h2>
   {updates.length?updates.map(x=><div className="admin-notification-history" key={x.id}><div><b>v{x.version} · Build {Number(x.versionCode||0)} · {Number(x.sizeMb||0).toFixed(2)} MB</b><p>{x.releaseNotes||"No release notes."}</p><small>{x.publishedAt?new Date(x.publishedAt).toLocaleString():"—"} · {x.pushSent||0} push sent · {x.pushFailed||0} failed</small></div></div>):<div className="country-loading">No updates published yet.</div>}
  </div>
 </div>;
}
