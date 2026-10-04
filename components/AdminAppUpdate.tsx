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

 async function load(){
  try{const r=await fetch("/api/admin/app-update",{cache:"no-store"});const d=await r.json();if(d.ok)setUpdates(d.updates||[])}catch{}
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
  <div className="notification-compose">
   <div className="notice"><span>📦</span><p>Publish an APK update. The native Numelixa app checks this automatically and detects the exact APK size automatically and shows it before updating without opening a browser.</p></div>
   <span className="eyebrow">APP UPDATE CENTER</span>
   <h2>Send new update</h2>
   <form onSubmit={publish} className="admin-form">
    <label>Version<input value={version} onChange={e=>setVersion(e.target.value)} placeholder="e.g. 2.4.0" required/></label>
        <label>APK HTTPS URL<input value={apkUrl} onChange={e=>setApkUrl(e.target.value)} type="url" placeholder="https://..." required/></label>
    <label>What's new<textarea value={notes} onChange={e=>setNotes(e.target.value)} maxLength={1200} rows={5} placeholder="Performance, notifications, fixes…"/></label>
    <label className="admin-check"><input type="checkbox" checked={force} onChange={e=>setForce(e.target.checked)}/> Required update</label>
    <label className="admin-check"><input type="checkbox" checked={sendAll} onChange={e=>setSendAll(e.target.checked)}/> Send update notification to all registered app devices</label>
    <button className="primary-btn" disabled={busy}>{busy?"Publishing…":"🚀 Publish & Send Update"}</button>
    {result&&<div className="success-box">{result}</div>}
   </form>
  </div>
  <div className="admin-card"><h2>Update history</h2>
   {updates.length?updates.map(x=><div className="admin-notification-history" key={x.id}><div><b>v{x.version} · {Number(x.sizeMb||0).toFixed(2)} MB</b><p>{x.releaseNotes||"No release notes."}</p><small>{x.publishedAt?new Date(x.publishedAt).toLocaleString():"—"} · {x.pushSent||0} push sent · {x.pushFailed||0} failed</small></div></div>):<div className="country-loading">No updates published yet.</div>}
  </div>
 </div>;
}
