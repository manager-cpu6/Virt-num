"use client";

import Link from "next/link";
import ServiceLogo from "@/components/ServiceLogo";
import {useEffect,useMemo,useState} from "react";

type Activity={id:string;service:string;country:string;phone:string;type:string;time:string};
type ActiveNumber={id:string;service:string;country:string;phone:string;status:string;createdAt:string;expiresAt:string|null};
type Promo={tag:string;title:string;text:string;cta:string;href:string};

const promos:Promo[]=[
 {tag:"LIVE CATALOG",title:"Find a number for your next verification.",text:"Browse the live service list and check availability by country before purchase.",cta:"Explore services",href:"/services"},
 {tag:"ORDER TRACKING",title:"Keep your activation and SMS together.",text:"Track the number, activation status and messages reported for your order.",cta:"View your orders",href:"/numbers"},
 {tag:"DEVELOPER API",title:"Integrate verified number workflows.",text:"Explore the documented API for services, stock, orders, balances and SMS retrieval.",cta:"Open API docs",href:"/developers/docs"}
];

function flagFor(country:string){
 const flags:Record<string,string>={US:"🇺🇸",GB:"🇬🇧",NG:"🇳🇬",CA:"🇨🇦",DE:"🇩🇪",FR:"🇫🇷",BR:"🇧🇷",IN:"🇮🇳",AU:"🇦🇺",AE:"🇦🇪",ZA:"🇿🇦"};
 return flags[country]||"◎";
}

function ago(value:string){
 const sec=Math.max(0,Math.floor((Date.now()-new Date(value).getTime())/1000));
 if(sec<10)return "Just now";
 if(sec<60)return sec+"s ago";
 const min=Math.floor(sec/60);
 return min+"m ago";
}

export default function HomeLiveBoard(){
 const[data,setData]=useState<{activeNumbers:ActiveNumber[];activity:Activity[]}>({activeNumbers:[],activity:[]});
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

 const liveNumbers=useMemo<Array<{country:string;flag:string;number:string;service:string;status:string}>>(()=>data.activeNumbers.map(n=>({
  country:n.country||"—",
  flag:flagFor(String(n.country||"").toUpperCase()),
  number:n.phone||"••••",
  service:n.service,
  status:n.status
 })),[data.activeNumbers]);

 return <section className="home-live-board-v2">
  <div className="live-v2-heading">
   <div>
    <span className="eyebrow">NUMELIXA LIVE NETWORK</span>
    <h2>Live activity, when it happens.</h2>
    <p>Only real completed orders and SMS activity are shown here. This feed refreshes automatically.</p>
   </div>
   <div className="live-v2-status"><i/>{data.activity.length?"LIVE":"WAITING"} <small>Auto refresh</small></div>
  </div>


  <div className="live-v2-main-grid">
   <div className="live-v2-numbers-card">
    <div className="live-v2-card-top">
     <div><span className="live-v2-kicker">YOUR NUMBERS</span><h3>Active number orders</h3></div>
     <span className="live-v2-counter"><i/> {liveNumbers.length ? `${liveNumbers.length} ACTIVE` : "NO ACTIVE ORDERS"}</span>
    </div>

    <div className="live-number-list">
     {liveNumbers.length?liveNumbers.map((n:{country:string;flag:string;number:string;service:string;status:string},i:number)=><div className="live-number-item" key={n.number+i}>
       <span className="live-number-flag">{n.flag}</span>
       <div className="live-number-info"><b>{n.number}</b><small>{n.service} · {n.country}</small></div>
       <span className="live-number-state"><i/>{n.status==="waiting"?"Waiting for SMS":"Active"}</span>
      </div>):<div className="live-sms-empty"><span className="sms-empty-icon">＋</span><b>No active number orders</b><small>Numbers you purchase will appear here while waiting for SMS.</small></div>}
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
       <ServiceLogo id={a.service} name={a.service} className="live-sms-icon"/>
       <div><b>{a.service} <em>{a.country}</em></b><small>{a.phone} · {a.type}</small></div>
       <time>{ago(a.time)}</time>
      </div>):<div className="live-sms-empty"><span className="sms-empty-icon">✦</span><b>No recent SMS activity</b><small>Your completed verifications will appear here when available.</small></div>}
    </div>
   </div>

   <div className="live-v2-ad-card">
    <div className="ad-orbit ad-orbit-one"/><div className="ad-orbit ad-orbit-two"/>
    <div className="ad-phone">
      <div className="ad-phone-speaker"/>
      <div className="ad-phone-screen">
       <span className="ad-screen-label">APP PREVIEW</span>
       <strong>••• ••• ••••</strong>
       <small>Verification status</small>
       <div className="ad-code"><i/> •• ••••</div>
       <span className="ad-secure">Waiting for SMS</span>
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
