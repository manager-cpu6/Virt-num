"use client";
import {useEffect,useState} from "react";
import {Capacitor,registerPlugin} from "@capacitor/core";

type Update={version:string;versionCode:number;sizeMb:number;sizeBytes?:number;apkUrl:string;releaseNotes:string;force:boolean;publishedAt?:string|null};
type Progress={status:"idle"|"downloading"|"completed"|"failed";downloadedBytes:number;totalBytes:number;percent:number;mbDownloaded:number;mbTotal:number;notification?:string};
type UpdaterPlugin={
 installApk(options:{url:string;fileName:string}):Promise<{started:boolean;downloadId?:number}>;
 getDownloadProgress():Promise<Progress>;
 openDownloadedApk():Promise<{opened:boolean}>;
};
const NumelixaUpdater=registerPlugin<UpdaterPlugin>("NumelixaUpdater");

const mb=(n:number)=>n>0?(n/1024/1024).toFixed(2):"0.00";

export default function AppUpdateGate(){
 const[update,setUpdate]=useState<Update|null>(null),[visible,setVisible]=useState(false),[busy,setBusy]=useState(false),[error,setError]=useState("");
 const[progress,setProgress]=useState<Progress>({status:"idle",downloadedBytes:0,totalBytes:0,percent:0,mbDownloaded:0,mbTotal:0});
 useEffect(()=>{
  if(!Capacitor.isNativePlatform())return;
  let cancelled=false;
  const load=async()=>{
   try{
    const r=await fetch("/api/app-update",{cache:"no-store"}); const d=await r.json();
    if(cancelled||!d?.update)return;
    const u=d.update as Update;
    if(u.version&&u.version!=="2.4.0"){setUpdate(u);setVisible(true);}
   }catch{}
  };
  load();
  const poll=window.setInterval(async()=>{
   if(cancelled)return;
   try{
    const p=await NumelixaUpdater.getDownloadProgress();
    if(p.status!=="idle"){setProgress(p);if(p.status==="completed")setBusy(false);if(p.status==="failed")setBusy(false);}
   }catch{}
  },700);
  return()=>{cancelled=true;window.clearInterval(poll)};
 },[]);
 useEffect(()=>{
  if(!visible||!update||!Capacitor.isNativePlatform())return;
  NumelixaUpdater.getDownloadProgress().then(p=>{if(p.status!=="idle")setProgress(p)}).catch(()=>{});
 },[visible,update]);
 useEffect(()=>{
  if(!visible||!update||!update.force)return;
  if(progress.status==="completed") NumelixaUpdater.openDownloadedApk().catch(e=>{console.error("[NUMELIXA UPDATE OPEN]",e);});
 },[visible,update,progress.status]);
 if(!visible||!update)return null;
 const install=async()=>{
  setBusy(true);setError("");
  try{
   if(Capacitor.getPlatform()!=="android")throw new Error("ANDROID_ONLY");
   const p=await NumelixaUpdater.getDownloadProgress();
   if(p.status==="completed"){await NumelixaUpdater.openDownloadedApk();return;}
   await NumelixaUpdater.installApk({url:update.apkUrl,fileName:"Numelixa-"+update.version+".apk"});
   setProgress({
    status:"downloading",
    downloadedBytes:p.downloadedBytes||0,
    totalBytes:p.totalBytes||Number(update.sizeBytes||0),
    percent:p.percent||0,
    mbDownloaded:p.mbDownloaded||0,
    mbTotal:p.mbTotal||Number(update.sizeMb||0),
    notification:"Download continues in the background"
   });
  }catch(e){console.error("[NUMELIXA UPDATE INSTALL]",e);setError("Unable to start the update. Please try again.");setBusy(false);}
 };
 const totalBytes=progress.totalBytes||Number(update.sizeBytes||0);
 const downloaded=progress.downloadedBytes||0;
 const percent=progress.percent>0?Math.min(100,progress.percent):totalBytes>0?Math.min(100,(downloaded/totalBytes)*100):0;
 const downloadedMb=progress.mbDownloaded||Number((downloaded/1024/1024).toFixed(2));
 const totalMb=progress.mbTotal||Number((totalBytes/1024/1024).toFixed(2))||Number(update.sizeMb||0);
 const done=progress.status==="completed";
 return <div className="numelixa-update-backdrop"><section className="numelixa-update-card" role="dialog" aria-modal="true">
  <div className="numelixa-update-icon">{done?"✓":"↟"}</div><span className="eyebrow">{update.force?"REQUIRED UPDATE":"NEW UPDATE"}</span>
  <h2>Numelixa {update.version}</h2><p>{done?"Update downloaded successfully. Install it to continue.":update.releaseNotes||"A new version of Numelixa is ready with improvements and fixes."}</p>
  <div className="numelixa-update-meta"><span>APK SIZE</span><b>{totalMb.toFixed(2)} MB</b></div>
  {(busy||progress.status==="downloading"||done)&&<div className="numelixa-download-progress">
    <div className="numelixa-download-progress-head"><span>{done?"Downloaded":"Downloading update"}</span><b>{percent.toFixed(0)}%</b></div>
    <div className="numelixa-download-track"><i style={{width:percent+"%"}}/></div>
    <div className="numelixa-download-size"><span>{downloadedMb.toFixed(2)} MB downloaded</span><b>{Math.max(0,totalMb-downloadedMb).toFixed(2)} MB remaining</b></div>
    {!done&&<small>Download continues even if you close the app. You can return to Numelixa when it finishes.</small>}
  </div>}
  {error&&<div className="error-box">{error}</div>}
  <button className="primary-btn full" onClick={done?()=>NumelixaUpdater.openDownloadedApk():install} disabled={busy&&!done}>{done?"Install update":busy?"Downloading…":"Download update"} <span>→</span></button>
  {!update.force&&<button className="secondary-btn full" onClick={()=>setVisible(false)} disabled={busy}>Later</button>}
  {update.force&&<small>This update is required to continue using Numelixa.</small>}
 </section></div>;
}
