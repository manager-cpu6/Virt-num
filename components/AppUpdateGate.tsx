"use client";
import {useEffect,useState} from "react";
import {Capacitor,registerPlugin} from "@capacitor/core";

type Update={version:string;versionCode:number;sizeMb:number;apkUrl:string;releaseNotes:string;force:boolean;publishedAt?:string|null};
type UpdaterPlugin={installApk(options:{url:string;fileName:string}):Promise<{started:boolean;needsInstallPermission?:boolean}>};
const NumelixaUpdater=registerPlugin<UpdaterPlugin>("NumelixaUpdater");\nconst CURRENT_APP_VERSION="2.4.3";

export default function AppUpdateGate(){
 const[update,setUpdate]=useState<Update|null>(null),[visible,setVisible]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState("");
 useEffect(()=>{
  if(!Capacitor.isNativePlatform())return;
  let cancelled=false;
  fetch("/api/app-update",{cache:"no-store"}).then(r=>r.json()).then(d=>{
   if(cancelled||!d?.update)return;
   const u=d.update as Update;
   if(u.version&&compareVersions(u.version,CURRENT_APP_VERSION)>0){setUpdate(u);setVisible(true);}\n  }).catch(()=>{});
  }).catch(()=>{});
  return()=>{cancelled=true};
 },[]);
 if(!visible||!update)return null;
 const install=async()=>{
  setBusy(true);setError("");
  try{
   if(Capacitor.getPlatform()!=="android")throw new Error("ANDROID_ONLY");
   const result=await NumelixaUpdater.installApk({url:update.apkUrl,fileName:"Numelixa-"+update.version+".apk"});\n   if(result?.needsInstallPermission){setError("Allow Numelixa to install the update, then tap Update now again.");setBusy(false);return;}\n   if(!result?.started)throw new Error("UPDATE_NOT_STARTED");
  }catch(e){console.error("[NUMELIXA UPDATE INSTALL]",e);setError("Unable to start the in-app update. Please try again.");setBusy(false);}
 };
 return <div className="numelixa-update-backdrop"><section className="numelixa-update-card" role="dialog" aria-modal="true">
  <div className="numelixa-update-icon">↟</div><span className="eyebrow">{update.force?"REQUIRED UPDATE":"NEW UPDATE"}</span>
  <h2>Numelixa {update.version}</h2><p>{update.releaseNotes||"A new version of Numelixa is ready with improvements and fixes."}</p>
  <div className="numelixa-update-meta"><span>APK SIZE</span><b>{Number(update.sizeMb||0).toFixed(2)} MB</b></div>
  {error&&<div className="error-box">{error}</div>}
  <button className="primary-btn full" onClick={install} disabled={busy}>{busy?"Downloading update…":"Update now"} <span>→</span></button>
  {!update.force&&<button className="secondary-btn full" onClick={()=>setVisible(false)} disabled={busy}>Later</button>}
  {update.force&&<small>This update is required to continue using Numelixa.</small>}
 </section></div>;
}\nfunction compareVersions(a:string,b:string){const pa=a.split(".").map(Number),pb=b.split(".").map(Number);for(let i=0;i<3;i++){const x=Number(pa[i]||0),y=Number(pb[i]||0);if(x!==y)return x-y;}return 0;}\n