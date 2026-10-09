"use client";

import Link from "next/link";
import {useEffect,useMemo,useState} from "react";

type Activity={id:string;service:string;country:string;phone:string;type:string;time:string;code?:string;demo?:boolean};
type Popular={service:string;country:string;label:string;flag:string;available?:boolean};

const promos=[
 {tag:"LIVE NUMBERS",title:"Your next number is already waiting.",text:"Browse live stock across popular apps and countries. Pick a service and start in seconds.",cta:"Explore numbers",href:"/services"},
 {tag:"INSTANT SMS",title:"Watch the verification arrive.",text:"Your number, activation status and incoming SMS stay together in one clean workspace.",cta:"See how it works",href:"/numbers"},
 {tag:"DEVELOPER API",title:"Power your product with Numelixa.",text:"One API for live numbers, orders, balances and verification workflows.",cta:"Open Developer API",href:"/developers"}
];

function flagFor(country:string){
 const flags:Record<string,string>={US:"🇺🇸",GB:"🇬🇧",NG:"🇳🇬",CA:"🇨🇦",DE:"🇩🇪",FR:"🇫🇷",BR:"🇧🇷",IN:"🇮🇳",AU:"🇦🇺",AE:"🇦🇪",ZA:"🇿🇦"};
 return flags[country]||"🌍";
}

function ago(value:string){
 const sec=Math.max(0,Math.floor((Date.now()-new Date(value).getTime())/1000));
 if(sec<10)return "Just now";
 if(sec<60)return sec+"s ago";
 const min=Math.floor(sec/60);
 return min+"m ago";
}

function serviceLetter(name:string){return (name.trim()[0]||"N").toUpperCase()}

export default function HomeLiveBoard(){
 const[data,setData]=useState<{popular:Popular[];activity:Activity[]}>({popular:[],activity:[]});
 const[promo,setPromo]=useState(0);
 const[stamp,setStamp]=useState(Date.now());

 async function load(){
  try{
   const r=await fetch("/api/home/live",{cache:"no-store"});
   const d=await r.json();
   if(d.ok)setData(d);
  }catch{}
 }

 useEffect(()=>{
  load();
  const a=setInterval(load,12000);
  const b=setInterval(()=>setStamp(Date.now()),1000);
  const c=setInterval(()=>setPromo(v=>(v+1)%promos.length),7000);
  return()=>{clearInterval(a);clearInterval(b);clearInterval(c)};
 },[]);

 const p=promos[promo];

 const liveNumbers=useMemo<Array<{country:string;flag:string;number:string;service:string}>>(()=>{
  const fromActivity=data.activity.slice(0,3).map(a=>({
   country:a.country||"LIVE",
   flag:flagFor(String(a.country||"").toUpperCase()),
   number:a.phone||"•••• ••••",
   service:a.service
  }));
  return fromActivity;
 },[data.activity]);

 return <section className="home-live-board-v2">
  <div className="live-v2-heading">
   <div>
    <span className="eyebrow">NUMELIXA LIVE NETWORK</span>
    <h2>See the network moving in real time.</h2>
    <p>Live numbers, incoming SMS and active services — presented as one simple command center.</p>
   </div>
   <div className="live-v2-status"><i/> LIVE <small>Auto refresh</small></div>
  </div>

  <div className="live-v2-popular">
   <div className="live-v2-section-label"><span>POPULAR RIGHT NOW</span><Link href="/services">View all →</Link></div>
   <div className="live-v2-popular-row">
    {(data.popular.length?data.popular.slice(0,6):[
     {service:"whatsapp",country:"US",label:"WhatsApp",flag:"🇺🇸"},
     {service:"telegram",country:"GB",label:"Telegram",flag:"🇬🇧"},
     {service:"instagram",country:"US",label:"Instagram",flag:"🇺🇸"},
     {service:"facebook",country:"NG",label:"Facebook",flag:"🇳🇬"},
     {service:"google",country:"US",label:"Google",flag:"🇺🇸"},
     {service:"tiktok",country:"NG",label:"TikTok",flag:"🇳🇬"}
    ]).map(s=><Link key={s.service+s.country} href={"/countries?service="+encodeURIComponent(s.service)} className="live-v2-service">
      <span className="live-v2-service-logo">{serviceLetter(s.label)}</span>
      <span><b>{s.label}</b><small>{s.flag} {s.country}</small></span>
      <i>↗</i>
    </Link>)}
   </div>
  </div>

  <div className="live-v2-main-grid">
   <div className="live-v2-numbers-card">
    <div className="live-v2-card-top">
     <div><span className="live-v2-kicker">LIVE NUMBERS</span><h3>Numbers being activated</h3></div>
     <span className="live-v2-counter"><i/> {data.activity.length ? `${data.activity.length} LIVE` : "NO LIVE ACTIVITY"}</span>
    </div>

    <div className="live-number-list">
     {liveNumbers.map((n:{country:string;flag:string;number:string;service:string},i:number)=><div className="live-number-item" key={n.number+i}>
       <span className="live-number-flag">{n.flag}</span>
       <div className="live-number-info"><b>{n.number}</b><small>{n.service} · {n.country}</small></div>
       <span className="live-number-state"><i/> Active</span>
      </div>)}
    </div>
    <Link href="/services" className="live-v2-card-action">Get a live number <span>→</span></Link>
   </div>

   <div className="live-v2-sms-card">
    <div className="live-v2-card-top">
     <div><span className="live-v2-kicker">INCOMING SMS</span><h3>Verification stream</h3></div>
     <span className="live-v2-ping"><i/> LIVE</span>
    </div>
    <div className="live-sms-stream">
     {data.activity.length?data.activity.slice(0,4).map(a=><div className="live-sms-row" key={a.id}>
       <span className="live-sms-icon">{serviceLetter(a.service)}</span>
       <div><b>{a.service} <em>{a.country}</em></b><small>{a.phone} · {a.type}</small></div>
       <time>{ago(a.time)}</time>
      </div>):<div className="live-sms-empty"><span className="sms-empty-icon">✦</span><b>Waiting for the next SMS</b><small>New completed verifications will appear here automatically.</small></div>}
    </div>
   </div>

   <div className="live-v2-ad-card">
    <div className="ad-orbit ad-orbit-one"/><div className="ad-orbit ad-orbit-two"/>
    <div className="ad-phone">
      <div className="ad-phone-speaker"/>
      <div className="ad-phone-screen">
       <span className="ad-screen-label">NUMELIXA</span>
       <strong>+1 ••• 4821</strong>
       <small>WhatsApp verification</small>
       <div className="ad-code"><i/> •• ••••</div>
       <span className="ad-secure">✓ SMS received securely</span>
      </div>
    </div>
    <div className="live-v2-ad-copy">
     <span className="live-v2-ad-badge"><i/> {p.tag}</span>
     <h3>{p.title}</h3>
     <p>{p.text}</p>
     <Link href={p.href} className="live-v2-ad-btn">{p.cta}<span>→</span></Link>
    </div>
   </div>
  </div>

  <div className="live-v2-footer">
   <span><i/> Network is updating automatically</span>
   <span>Last update · {new Date(stamp).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit",second:"2-digit"})}</span>
  </div>
 </section>
}
