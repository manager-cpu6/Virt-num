"use client";
import {useEffect,useState} from "react";

export default function AdminAppUpdate(){
 const[version,setVersion]=useState("");
 const[versionCode,setVersionCode]=useState("");
 const[apkUrl,setApkUrl]=useState("");
 const[sizeMb,setSizeMb]=useState("");
 const[notes,setNotes]=useState("");
 const[force,setForce]=useState(false);
 const[sendAll,setSendAll]=useState(true);
 const[busy,setBusy]=useState(false);
 const[result,setResult]=useState("");
 const[updates,setUpdates]=useState<any[]>([]);

 async function load(){
  try{
   const r=await fetch("/api/admin/app-update",{cache:"no-store"});
   const d=await r.json();
   if(d.ok)setUpdates(d.updates||[]);
  }catch{}
 }
 useEffect(()=>{load()},[]);

 async function publish(e:React.FormEvent){
  e.preventDefault();
  setBusy(true);setResult("");
  try{
   const r=await fetch("/api/admin/app-update",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    credentials:"include",
    body:JSON.stringify({
     version,versionCode:Number(versionCode||0),apkUrl,sizeMb:Number(sizeMb||0),
     releaseNotes:notes,force,sendAll
    })
   });
   const d=await r.json();
   if(!d.ok){setResult("❌ "+(d.error||"Publish failed"));return}
   setResult(sendAll
    ?"✅ Update published. "+d.sizeMb+" MB · push sent to "+d.sent+" devices."
    :"✅ Update published. "+d.sizeMb+" MB. Users will see it in the app.");
   setVersion("");setVersionCode("");setApkUrl("");setSizeMb("");setNotes("");setForce(false);
   await load();
  }finally{setBusy(false)}
 }

 return <div className="admin-notifications">
  <div className="notification-compose">
   <div className="notice"><span>📦</span><p>The update is downloaded by the Numelixa Android app itself. It does not use Chrome or Android Download Manager. If the app is closed, the Android notification continues showing the real download progress.</p></div>
   <span className="eyebrow">APP UPDATE CENTER</span>
   <h2>Publish an update</h2>
   <form onSubmit={publish} className="admin-form">
    <label>Version name
     <input value={version} onChange={e=>setVersion(e.target.value)} placeholder="e.g. 2.4.3" required/>
    </label>
    <label>Android version code <span className="field-help">optional</span>
     <input value={versionCode} onChange={e=>setVersionCode(e.target.value.replace(/\D/g,""))} inputMode="numeric" placeholder="e.g. 250"/>
     <small>Use the APK's versionCode when you know it. The app also uses the release ID so an admin-created update is not ignored just because the version name did not change.</small>
    </label>
    <label>APK HTTPS URL
     <input value={apkUrl} onChange={e=>setApkUrl(e.target.value)} type="url" placeholder="https://..." required/>
    </label>
    <label>APK size (MB) <span className="field-help">optional</span>
     <input value={sizeMb} onChange={e=>setSizeMb(e.target.value)} type="number" min="0.01" step="0.01" placeholder="Leave blank for automatic exact detection"/>
     <small>Leave blank to detect the file size automatically. Enter it manually when the APK host does not expose Content-Length.</small>
    </label>
    <label>What's new
     <textarea value={notes} onChange={e=>setNotes(e.target.value)} maxLength={1200} rows={5} placeholder="Performance, notifications, fixes…"/>
    </label>
    <label className="admin-check"><input type="checkbox" checked={force} onChange={e=>setForce(e.target.checked)}/> Required update</label>
    <label className="admin-check"><input type="checkbox" checked={sendAll} onChange={e=>setSendAll(e.target.checked)}/> Send update notification to all registered app devices</label>
    <button className="primary-btn" disabled={busy}>{busy?"Publishing…":"🚀 Publish & Send Update"}</button>
    {result&&<div className="success-box">{result}</div>}
   </form>
  </div>
  <div className="admin-card"><h2>Update history</h2>
   {updates.length?updates.map(x=><div className="admin-notification-history" key={x.id}>
    <div>
     <b>v{x.version} · {Number(x.sizeMb||0).toFixed(2)} MB</b>
     <p>{x.releaseNotes||"No release notes."}</p>
     <small>{x.publishedAt?new Date(x.publishedAt).toLocaleString():"—"} · {x.pushSent||0} push sent · {x.pushFailed||0} failed</small>
    </div>
   </div>):<div className="country-loading">No updates published yet.</div>}
  </div>
 </div>;
}
