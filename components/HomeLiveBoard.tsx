"use client";

import Link from "next/link";
import ServiceLogo from "@/components/ServiceLogo";
import {useEffect,useMemo,useState} from "react";

type Activity={id:string;service:string;country:string;phone:string;type:string;time:string};

type Promo={tag:string;title:string;text:string;cta:string;href:string};

const promos:Promo[]=[
 {tag:"LIVE CATALOG",title:"Find a number for your next verification.",text:"Browse the live service list and check availability by country before purchase.",cta:"Explore services",href:"/services"},
 {tag:"ORDER TRACKING",title:"Keep your activation and SMS together.",text:"Track the number, activation status and messages reported for your order.",cta:"View your orders",href:"/numbers"},
 {tag:"DEVELOPER API",title:"Integrate verified number workflows.",text:"Explore the documented API for services, stock, orders, balances and SMS retrieval.",cta:"Open API docs",href:"/developers/docs"}
];

function flagFor(country:string){
 const flags:Record<string,string>={US:"🇺🇸",USA:"🇺🇸",GB:"🇬🇧",UK:"🇬🇧",NG:"🇳🇬",NIGERIA:"🇳🇬",CA:"🇨🇦",CANADA:"🇨🇦",DE:"🇩🇪",GERMANY:"🇩🇪",FR:"🇫🇷",FRANCE:"🇫🇷",BR:"🇧🇷",IN:"🇮🇳",AU:"🇦🇺",AE:"🇦🇪",ZA:"🇿🇦",ET:"🇪🇹",ETHIOPIA:"🇪🇹",SO:"🇸🇴",SOMALIA:"🇸🇴",KE:"🇰🇪",KENYA:"🇰🇪"};
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
 const[data,setData]=useState<{activity:Activity[]}>({activity:[]});
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

 const liveServices=useMemo(()=>Array.from(new Map(data.activity.map(a=>[a.service.toLowerCase(),a])).values()).slice(0,6),[data.activity]);

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
     <div><span className="live-v2-kicker">LIVE SERVICE STREAM</span><h3>Recently verified services</h3></div>
     <span className="live-v2-counter"><i/> {liveServices.length ? `${liveServices.length} SERVICES` : "AWAITING ACTIVITY"}</span>
    </div>
    <div className="live-number-list">
     {liveServices.length?liveServices.map((a,i)=><div className="live-number-item" key={a.service+i}>
       <ServiceLogo id={a.service} name={a.service} className="live-sms-icon"/>
       <div className="live-number-info"><b>{a.service}</b><small>{flagFor(String(a.country||"").toUpperCase())} {a.country} · Verified activity</small></div>
       <span className="live-number-state"><i/>{ago(a.time)}</span>
      </div>):<div className="live-sms-empty"><span className="sms-empty-icon">✦</span><b>Services will appear here</b><small>Recent verified service activity will rotate here. Personal phone numbers are never displayed.</small></div>}
    </div>
    <Link href="/services" className="live-v2-card-action">Explore services <span>→</span></Link>
   </div>

   <div className="live-v2-sms-card">
    <div className="live-v2-card-top">
     <div><span className="live-v2-kicker">INCOMING SMS</span><h3>Verification stream</h3></div>
     <span className="live-v2-ping"><i/> LIVE</span>
    </div>
    <div className="live-sms-stream">
     {data.activity.length?data.activity.slice(0,4).map(a=><div className="live-sms-row" key={a.id}>
       <ServiceLogo id={a.service} name={a.service} className="live-sms-icon"/>
       <div><b>{a.service} <em>{a.country}</em></b><small>{a.type} · {a.country}</small></div>
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
