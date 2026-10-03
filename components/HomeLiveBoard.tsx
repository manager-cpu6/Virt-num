"use client";
import Link from "next/link";
import {useEffect,useState} from "react";

type Activity={id:string;service:string;country:string;phone:string;type:string;time:string};
type Popular={service:string;country:string;label:string;flag:string;available?:boolean};

const promos=[
 {tag:"LIVE OFFER",title:"Popular numbers are moving fast",text:"Check live availability before you order.",href:"/services"},
 {tag:"FAST SMS",title:"Code arrives on your screen",text:"Watch your verification status update live.",href:"/services"},
 {tag:"NUMELIXA API",title:"Build with live number access",text:"Use the Developer API for automated orders.",href:"/developers"}
];

function ago(value:string){
 const sec=Math.max(0,Math.floor((Date.now()-new Date(value).getTime())/1000));
 if(sec<10)return "Just now";
 if(sec<60)return sec+"s ago";
 const min=Math.floor(sec/60);return min+"m ago";
}

export default function HomeLiveBoard(){
 const[data,setData]=useState<{popular:Popular[];activity:Activity[]}>({popular:[],activity:[]});
 const[promo,setPromo]=useState(0);
 const[stamp,setStamp]=useState(Date.now());

 async function load(){
  try{const r=await fetch("/api/home/live",{cache:"no-store"});const d=await r.json();if(d.ok)setData(d)}catch{}
 }
 useEffect(()=>{load();const a=setInterval(load,12000),b=setInterval(()=>setStamp(Date.now()),1000),c=setInterval(()=>setPromo(v=>(v+1)%promos.length),6000);return()=>{clearInterval(a);clearInterval(b);clearInterval(c)}},[]);
 const p=promos[promo];
 return <section className="home-live-board">
  <div className="live-board-head">
   <div><span className="eyebrow">LIVE NETWORK</span><h2>What's happening now</h2><p>Real platform activity, live availability and current Numelixa updates.</p></div>
   <span className="live-status"><i/> LIVE</span>
  </div>

  <div className="popular-service-grid">
   {data.popular.map(s=><Link href={"/services/"+s.service} className="live-service-card" key={s.service}>
    <span className="live-service-icon">{s.label.slice(0,1)}</span>
    <span className="live-service-copy"><b>{s.label}</b><small>{s.flag} {s.country.toUpperCase()} · {s.available===false?"Checking stock":"Live numbers"}</small></span>
    <span className="live-service-arrow">→</span>
   </Link>)}
  </div>

  <div className="live-board-grid">
   <div className="live-activity-card">
    <div className="live-card-head"><div><span className="eyebrow">SMS ACTIVITY</span><b>Numbers & SMS received</b></div><span className="live-mini">● LIVE</span></div>
    <div className="activity-feed">
     {data.activity.length?data.activity.map(a=><div className="activity-row" key={a.id}>
       <span className="activity-app">{a.service.slice(0,1)}</span>
       <span className="activity-main"><b>{a.service} <em>{a.country&&"· "+a.country}</em></b><small>{a.phone} · {a.type}</small></span>
       <time>{ago(a.time)}</time>
      </div>):<div className="activity-empty"><strong>Waiting for live SMS activity…</strong><small>New completed verifications will appear here automatically.</small></div>}
    </div>
   </div>
   <Link href={p.href} className="live-promo-card">
    <span className="promo-glow"/>
    <span className="promo-live"><i/> {p.tag}</span>
    <strong>{p.title}</strong>
    <p>{p.text}</p>
    <span className="promo-action">Explore →</span>
   </Link>
  </div>
  <div className="live-refresh">Updated live · {new Date(stamp).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit",second:"2-digit"})}</div>
 </section>
}