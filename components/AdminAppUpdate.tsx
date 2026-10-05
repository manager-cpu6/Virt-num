"use client";
import {useEffect,useState} from "react";

export default function AdminAppUpdate(){
 const[version,setVersion]=useState("");
 const[versionCode,setVersionCode]=useState("");
 const DEFAULT_APK_SOURCE="https://github.com/manager-cpu6/Virt-num/releases/download/android-latest/Numelixa.apk";
 const[apkUrl,setApkUrl]=useState(DEFAULT_APK_SOURCE);
 const[sizeMb,setSizeMb]=useState("");
 const[notes,setNotes]=useState("");
 const[installRequired,setInstallRequired]=useState(false);
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
     releaseNotes:notes,installRequired,force:installRequired,sendAll
    })
   });
   const d=await r.json();
   if(!d.ok){setResult("❌ "+(d.error||"Publish failed"));return}
   setResult(sendAll
    ?"✅ Update published. "+d.sizeMb+" MB · push sent to "+d.sent+" devices."
    :"✅ Update published. "+d.sizeMb+" MB. Users will see it in the app.");
   setVersion("");setVersionCode("");setApkUrl(DEFAULT_APK_SOURCE);setSizeMb("");setNotes("");setInstallRequired(false);
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
    <label>APK source (GitHub)
     <input value={apkUrl} onChange={e=>setApkUrl(e.target.value)} type="url" placeholder="https://github.com/..." required/>
     <small>GitHub is used only as the private publishing source. Users will never receive the GitHub link. After publishing, the app downloads from <b>https://apk.numelixa.com/android</b>.</small>
    </label>
    <label>APK size (MB) <span className="field-help">optional</span>
     <input value={sizeMb} onChange={e=>setSizeMb(e.target.value)} type="number" min="0.01" step="0.01" placeholder="Leave blank for automatic exact detection"/>
     <small>Leave blank to detect the file size automatically. Enter it manually when the APK host does not expose Content-Length.</small>
    </label>
    <label>What's new
     <textarea value={notes} onChange={e=>setNotes(e.target.value)} maxLength={1200} rows={5} placeholder="Performance, notifications, fixes…"/>
    </label>
    <div className="admin-update-mode">
     <b>Update behavior</b>
     <label className="admin-check"><input type="radio" name="update-mode" checked={!installRequired} onChange={()=>setInstallRequired(false)}/> Download update only — no APK installation. After the download finishes, the app returns to normal automatically.</label>
     <label className="admin-check"><input type="radio" name="update-mode" checked={installRequired} onChange={()=>setInstallRequired(true)}/> Require APK installation — user must install the downloaded APK before continuing.</label>
     <small>Installation is never opened for a download-only update. Required mode keeps the app blocked until Android installation is completed.</small>
    </div>
    <label className="admin-check"><input type="checkbox" checked={sendAll} onChange={e=>setSendAll(e.target.checked)}/> Send update notification to all registered app devices</label>
    <button className="primary-btn" disabled={busy}>{busy?"Publishing…":"🚀 Publish & Send Update"}</button>
    {result&&<div className="success-box">{result}</div>}
   </form>
  </div>
  <div className="admin-card"><h2>Update history</h2>
   {updates.length?updates.map(x=><div className="admin-notification-history" key={x.id}>
    <div>
     <b>v{x.version} · {Number(x.sizeMb||0).toFixed(2)} MB · {x.installRequired?"Install required":"Download only"}</b>
     <p>{x.releaseNotes||"No release notes."}</p>
     <small>{x.publishedAt?new Date(x.publishedAt).toLocaleString():"—"} · {x.pushSent||0} push sent · {x.pushFailed||0} failed</small>
    </div>
   </div>):<div className="country-loading">No updates published yet.</div>}
  </div>
 </div>;
}
