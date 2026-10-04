"use client";
import {useEffect,useState} from "react";

type Update={version:string;versionCode:number;sizeMb:number;apkUrl:string;releaseNotes:string;force:boolean;publishedAt?:string|null};

export default function AppUpdateGate(){
 const[update,setUpdate]=useState<Update|null>(null);
 const[visible,setVisible]=useState(false);
 useEffect(()=>{
  if(!document.documentElement.classList.contains("numelixa-native"))return;
  let cancelled=false;
  fetch("/api/app-update",{cache:"no-store"}).then(r=>r.json()).then(d=>{
   if(cancelled||!d?.update)return;
   const u=d.update as Update;
   const current=String(document.body.getAttribute("data-numelixa-version")||"2.3.0");
   if(u.version && u.version!==current){setUpdate(u);setVisible(true);}
  }).catch(()=>{});
  return()=>{cancelled=true};
 },[]);
 if(!visible||!update)return null;
 const close=()=>{if(!update.force)setVisible(false)};
 return <div className="numelixa-update-backdrop">
  <section className="numelixa-update-card" role="dialog" aria-modal="true">
   <div className="numelixa-update-icon">↗</div>
   <span className="eyebrow">{update.force?"REQUIRED UPDATE":"NEW UPDATE"}</span>
   <h2>Numelixa {update.version}</h2>
   <p>{update.releaseNotes||"A new version of Numelixa is ready with improvements and fixes."}</p>
   <div className="numelixa-update-meta"><span>APK</span><b>{Number(update.sizeMb||0).toFixed(1)} MB</b></div>
   <a className="primary-btn full" href={update.apkUrl}>Update now <span>→</span></a>
   {!update.force&&<button className="secondary-btn full" onClick={close}>Later</button>}
   {update.force&&<small>This update is required to continue using Numelixa.</small>}
  </section>
 </div>;
}
