"use client";

import Link from "next/link";
import ServiceLogo,{hasKnownServiceBrand} from "@/components/ServiceLogo";
import {useEffect,useMemo,useState} from "react";

type Activity={id:string;service:string;country:string;phone:string;type:string;time:string};
type ActiveNumber={id:string;service:string;country:string;phone:string;status:string;createdAt:string;expiresAt:string|null};

function flagFor(country:string){
 const flags:Record<string,string>={US:"🇺🇸",USA:"🇺🇸",GB:"🇬🇧",UK:"🇬🇧",NG:"🇳🇬",NIGERIA:"🇳🇬",CA:"🇨🇦",CANADA:"🇨🇦",DE:"🇩🇪",GERMANY:"🇩🇪",FR:"🇫🇷",FRANCE:"🇫🇷",BR:"🇧🇷",IN:"🇮🇳",AU:"🇦🇺",AE:"🇦🇪",ZA:"🇿🇦",ET:"🇪🇹",ETHIOPIA:"🇪🇹",SO:"🇸🇴",SOMALIA:"🇸🇴",KE:"🇰🇪",KENYA:"🇰🇪"};
 return flags[country]||"◎";
}
function ago(value:string){
 const sec=Math.max(0,Math.floor((Date.now()-new Date(value).getTime())/1000));
 if(sec<10)return "Just now";
 if(sec<60)return sec+"s ago";
 return Math.floor(sec/60)+"m ago";
}

export default function HomeLiveBoard(){
 const[data,setData]=useState<{activeNumbers:ActiveNumber[];activity:Activity[]}>({activeNumbers:[],activity:[]});
 const[loading,setLoading]=useState(true);
 const[failed,setFailed]=useState(false);
 const[updatedAt,setUpdatedAt]=useState<Date|null>(null);
 async function load(){
  try{
   const r=await fetch("/api/home/live",{cache:"no-store",credentials:"include"});
   const d=await r.json();
   if(!r.ok||!d.ok)throw new Error("Activity unavailable");
   setData({activeNumbers:Array.isArray(d.activeNumbers)?d.activeNumbers:[],activity:Array.isArray(d.activity)?d.activity:[]});
   setFailed(false);setUpdatedAt(new Date());
  }catch{setFailed(true)}
  finally{setLoading(false)}
 }
 useEffect(()=>{void load();const timer=setInterval(()=>void load(),12000);return()=>clearInterval(timer)},[]);
 const liveNumbers=useMemo(()=>data.activeNumbers.filter(n=>hasKnownServiceBrand(n.service,n.service)).map(n=>({
  country:n.country||"—",flag:flagFor(String(n.country||"").toUpperCase()),
  number:n.phone||"••••",service:n.service,status:n.status
 })),[data.activeNumbers]);
 const recentActivity=useMemo(()=>data.activity.filter(a=>hasKnownServiceBrand(a.service,a.service)).slice(0,4),[data.activity]);
 return <section className="home-live-board-v2">
  <div className="live-v2-heading">
   <div><span className="eyebrow">YOUR NUMELIXA ACTIVITY</span><h2>Your numbers and recent SMS.</h2><p>Private account activity only. Other users’ numbers and messages are never shown here.</p></div>
   <div className="live-v2-status"><i/>{loading?"SYNCING":failed?"RETRY NEEDED":recentActivity.length?"UPDATED":"UP TO DATE"} <small>Private to your account</small></div>
  </div>
  <div className="live-v2-main-grid">
   <div className="live-v2-numbers-card">
    <div className="live-v2-card-top"><div><span className="live-v2-kicker">YOUR NUMBERS</span><h3>Active number orders</h3></div><span className="live-v2-counter"><i/>{loading?"SYNCING":liveNumbers.length?liveNumbers.length+" ACTIVE":"NO ACTIVE ORDERS"}</span></div>
    <div className="live-number-list">
     {loading?<div className="live-sms-empty"><span className="nx-loading-orbit"/><b>Loading your numbers</b><small>Checking your active orders securely</small></div>
      :liveNumbers.length?liveNumbers.map((n,i)=><div className="live-number-item" key={n.number+i}>
       <span className="live-number-flag">{n.flag}</span><ServiceLogo id={n.service} name={n.service} className="live-number-brand"/>
       <div className="live-number-info"><b>{n.number}</b><small>{n.service} · {n.country}</small></div>
       <span className="live-number-state"><i/>{n.status==="waiting"?"Waiting for SMS":"Active"}</span>
      </div>)
      :<div className="live-sms-empty"><span className="sms-empty-icon">＋</span><b>No active number orders</b><small>Numbers you purchase will appear here while waiting for SMS.</small></div>}
    </div>
    <Link href="/services" className="live-v2-card-action">Get a live number <span>→</span></Link>
   </div>
   <div className="live-v2-sms-card">
    <div className="live-v2-card-top"><div><span className="live-v2-kicker">INCOMING SMS</span><h3>Your verification history</h3></div><span className="live-v2-ping"><i/>{loading?"SYNCING":recentActivity.length?"YOUR HISTORY":"NO RECENT SMS"}</span></div>
    <div className="live-sms-stream">
     {loading?<div className="live-sms-empty"><span className="nx-loading-orbit"/><b>Loading your SMS history</b><small>Only your own completed orders are shown here</small></div>
      :recentActivity.length?recentActivity.map(a=><div className="live-sms-row" key={a.id}>
       <ServiceLogo id={a.service} name={a.service} className="live-sms-icon"/>
       <div><b>{a.service} <em>{a.country}</em></b><small>{a.phone} · {a.type}</small></div><time>{ago(a.time)}</time>
      </div>)
      :<div className="live-sms-empty"><span className="sms-empty-icon">✦</span><b>No recent SMS activity</b><small>Your completed verifications will appear here when available.</small></div>}
    </div>
   </div>
  </div>
  <div className="live-v2-footer"><span><i/>{failed?"Unable to refresh activity":"Your account data refreshes automatically"}</span><span>{updatedAt?"Last update · "+updatedAt.toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"}):"Waiting for first update"}</span></div>
 </section>;
}
