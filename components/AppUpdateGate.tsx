"use client";
import {useEffect,useState} from "react";
import {Capacitor,registerPlugin} from "@capacitor/core";

type Update={
 id?:string;
 version:string;
 versionCode:number;
 sizeMb:number;
 sizeBytes?:number;
 apkUrl:string;
 releaseNotes:string;
 force:boolean;
 installRequired:boolean;
 publishedAt?:string|null
};
type Progress={
 status:"idle"|"downloading"|"completed"|"failed";
 downloadedBytes:number;
 totalBytes:number;
 percent:number;
 mbDownloaded:number;
 mbTotal:number;
 notification?:string
};
type UpdaterPlugin={
 installApk(options:{url:string;fileName:string;totalBytes?:number;installRequired?:boolean}):Promise<{started:boolean}>;
 getDownloadProgress():Promise<Progress>;
 getAppVersion():Promise<{version:string;versionCode:number}>;
 openDownloadedApk():Promise<{opened:boolean}>;
};
const NumelixaUpdater=registerPlugin<UpdaterPlugin>("NumelixaUpdater");
const mb=(n:number)=>n>0?(n/1024/1024).toFixed(2):"0.00";
const appliedKey=(id:string)=>"numelixa_applied_update_"+id;

export default function AppUpdateGate(){
 const[update,setUpdate]=useState<Update|null>(null);
 const[visible,setVisible]=useState(false);
 const[busy,setBusy]=useState(false);
 const[error,setError]=useState("");
 const[progress,setProgress]=useState<Progress>({status:"idle",downloadedBytes:0,totalBytes:0,percent:0,mbDownloaded:0,mbTotal:0});

 useEffect(()=>{
  if(!Capacitor.isNativePlatform())return;
  let cancelled=false;
  const load=async()=>{
   try{
    const r=await fetch("/api/app-update",{cache:"no-store"});
    const d=await r.json();
    if(cancelled||!d?.update)return;
    const u=d.update as Update;
    const releaseId=String(u.id||"");
    if(releaseId&&localStorage.getItem(appliedKey(releaseId))==="1")return;

    let native={version:"0.0.0",versionCode:0};
    try{native=await NumelixaUpdater.getAppVersion()}catch{}
    const serverCode=Number(u.versionCode||0);
    const installedCode=Number(native.versionCode||0);
    const newerByCode=serverCode>0&&installedCode>0&&serverCode>installedCode;
    const a=String(native.version||"0").split(".").map(Number);
    const b=String(u.version||"0").split(".").map(Number);
    const newerByName=(b[0]||0)>(a[0]||0)||
      ((b[0]||0)===(a[0]||0)&&((b[1]||0)>(a[1]||0)||
      ((b[1]||0)===(a[1]||0)&&(b[2]||0)>(a[2]||0))));
    const sameVersionNewRelease=Boolean(releaseId)&&(
      (serverCode>0&&installedCode>0&&serverCode===installedCode) ||
      serverCode===0
    );
    if(newerByCode||newerByName||sameVersionNewRelease){
      setUpdate(u);setVisible(true);
    }
   }catch{}
  };
  void load();

  const poll=window.setInterval(async()=>{
   if(cancelled)return;
   try{
    const p=await NumelixaUpdater.getDownloadProgress();
    if(p.status!=="idle"){
      setProgress(p);
      if(p.status==="completed")setBusy(false);
      if(p.status==="failed"){
       setBusy(false);
       setError(p.notification||"Update download failed. Tap Download update to retry.");
      }
    }
   }catch{}
  },500);

  return()=>{cancelled=true;window.clearInterval(poll)};
 },[]);

 useEffect(()=>{
  if(!visible||!update||!Capacitor.isNativePlatform())return;
  NumelixaUpdater.getDownloadProgress().then(p=>{if(p.status!=="idle")setProgress(p)}).catch(()=>{});
 },[visible,update]);

 const openInstaller=async()=>{
  try{
   const result=await NumelixaUpdater.openDownloadedApk();
   if(result?.opened&&update?.id)localStorage.setItem(appliedKey(String(update.id)),"1");
  }catch(e){
   const message=String(e);
   if(message.includes("INSTALL_PERMISSION_REQUIRED")){
    setError("Allow Numelixa to install updates, then tap Install update again.");
   }else{
    setError(message||"Unable to open the downloaded update.");
   }
  }
 };

 useEffect(()=>{
  if(!visible||!update||progress.status!=="completed")return;
  if(update.installRequired){
   void openInstaller();
   return;
  }
  setBusy(true);
  const id=String(update.id||"");
  if(id)localStorage.setItem(appliedKey(id),"1");
  const timer=window.setTimeout(()=>{setBusy(false);setVisible(false)},1200);
  return()=>window.clearTimeout(timer);
 },[visible,update,progress.status]);

 if(!visible||!update)return null;

 const install=async()=>{
  setBusy(true);setError("");
  try{
   if(Capacitor.getPlatform()!=="android")throw new Error("ANDROID_ONLY");
   const p=await NumelixaUpdater.getDownloadProgress();
   if(p.status==="completed"){await openInstaller();setBusy(false);return;}
   await NumelixaUpdater.installApk({
    url:update.apkUrl,
    fileName:"Numelixa-"+update.version+".apk",
    totalBytes:Number(update.sizeBytes||0),
    installRequired:Boolean(update.installRequired)
   });
   setProgress({
    status:"downloading",
    downloadedBytes:p.downloadedBytes||0,
    totalBytes:p.totalBytes||Number(update.sizeBytes||0),
    percent:p.percent||0,
    mbDownloaded:p.mbDownloaded||0,
    mbTotal:p.mbTotal||Number(update.sizeMb||0),
    notification:"Download continues in the background"
   });
  }catch(e){
   console.error("[NUMELIXA UPDATE INSTALL]",e);
   setError(String(e).includes("INSTALL_PERMISSION_REQUIRED")
    ?"Allow Numelixa to install updates, then tap Install update again."
    :"Unable to start the update. Please try again.");
   setBusy(false);
  }
 };

 const totalBytes=progress.totalBytes||Number(update.sizeBytes||0);
 const downloaded=progress.downloadedBytes||0;
 const percent=progress.percent>0?Math.min(100,progress.percent):totalBytes>0?Math.min(100,(downloaded/totalBytes)*100):0;
 const downloadedMb=progress.mbDownloaded||Number((downloaded/1024/1024).toFixed(2));
 const totalMb=progress.mbTotal||Number((totalBytes/1024/1024).toFixed(2))||Number(update.sizeMb||0);
 const remainingMb=Math.max(0,totalMb-downloadedMb);
 const done=progress.status==="completed";
 const softDone=done&&!update.installRequired;

 return <div className={"numelixa-update-backdrop"+(update.force?" required":"")}>
  <section className="numelixa-update-card" role="dialog" aria-modal="true">
   <div className="numelixa-update-icon">{done?"✓":"↟"}</div>
   <span className="eyebrow">{update.force?"REQUIRED UPDATE":"NEW UPDATE"}</span>
   <h2>Numelixa {update.version}</h2>
   <p>{done?(update.installRequired?"Update downloaded successfully. Install it to continue.":"Update downloaded successfully. Finishing…"):update.releaseNotes||"A new version of Numelixa is ready with improvements and fixes."}</p>
   <div className="numelixa-update-meta"><span>APK SIZE</span><b>{totalMb.toFixed(2)} MB</b></div>
   {(busy||progress.status==="downloading"||done)&&<div className="numelixa-download-progress">
    <div className="numelixa-download-progress-head"><span>{done?"Downloaded":"Downloading update"}</span><b>{percent.toFixed(0)}%</b></div>
    <div className="numelixa-download-track"><i style={{width:percent+"%"}}/></div>
    <div className="numelixa-download-size">
     <span>{mb(downloaded).toString()} MB downloaded</span>
     <b>{remainingMb.toFixed(2)} MB remaining</b>
    </div>
    {!done&&<small>Download continues even if you close the app. Progress also remains in your Android notification.</small>}
   </div>}
   {error&&<div className="error-box">{error}</div>}
   <button className="primary-btn full" onClick={done?(update.installRequired?openInstaller:()=>{}):install} disabled={(busy&&!done)||(softDone)}>
    {done?(update.installRequired?"Install update":"Finishing…"):busy?"Downloading…":"Download update"} <span>→</span>
   </button>
   {!update.force&&<button className="secondary-btn full" onClick={()=>setVisible(false)} disabled={busy}>Later</button>}
   {update.installRequired&&<small>This update is required to continue using Numelixa.</small>}
  </section>
 </div>;
}
