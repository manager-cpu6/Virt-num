"use client";

import {useEffect, useRef, useState} from "react";

const demos = [
  {country:"United States", flag:"🇺🇸", number:"+1 202 555 4198", app:"WhatsApp", code:"482719"},
  {country:"United Kingdom", flag:"🇬🇧", number:"+44 7400 123 681", app:"Telegram", code:"731204"},
  {country:"Canada", flag:"🇨🇦", number:"+1 647 555 9032", app:"Instagram", code:"195638"},
  {country:"Germany", flag:"🇩🇪", number:"+49 151 884 276", app:"Google", code:"604921"},
];

export default function LivePhoneDemo(){
  const [index,setIndex]=useState(()=>Math.floor(Math.random()*demos.length));
  const [tick,setTick]=useState(0);
  const seenRef=useRef<number[]>([]);

  useEffect(()=>{
    const id=window.setInterval(()=>{
      setIndex(v=>{
        const candidates=demos.map((_,i)=>i).filter(i=>i!==v && !seenRef.current.includes(i));
        const next=candidates.length ? candidates[Math.floor(Math.random()*candidates.length)] : demos.map((_,i)=>i).filter(i=>i!==v)[Math.floor(Math.random()*(demos.length-1))];
        seenRef.current=[...seenRef.current,next].slice(-3);
        return next;\n      });
      setTick(v=>v+1);
    },2600);
    return ()=>window.clearInterval(id);
  },[]);

  const item=demos[index];
  return (
    <div className="nx-live-demo" aria-label="Live Numelixa SMS demo">
      <div className="nx-live-glow"/>
      <div className="nx-live-badge"><span/> LIVE · HD SMS</div>
      <div className="nx-live-phone">
        <div className="nx-live-speaker"/>
        <div className="nx-live-screen">
          <div className="nx-live-status"><span>9:41</span><span>●●● 5G</span></div>
          <div className="nx-live-appbar"><span className="nx-live-logo">N</span><b>Numelixa</b><i>•••</i></div>
          <div className="nx-live-number">
            <small>LIVE NUMBER</small>
            <strong key={`num-${tick}`}>{item.flag} {item.number}</strong>
            <span><i/> {item.country} · Available now</span>
          </div>
          <div className="nx-live-sms" key={`sms-${tick}`}>
            <div className="nx-live-sms-head"><b>{item.app}</b><span>JUST NOW</span></div>
            <strong>Your verification code</strong>
            <div className="nx-live-code">{item.code.split("").map((c,i)=><b key={i}>{c}</b>)}</div>
            <small>SMS received securely in Numelixa</small>
          </div>
          <div className="nx-live-actions"><span>Copy code</span><span>Copy number</span></div>
        </div>
      </div>
      <div className="nx-live-caption"><span><i/> Live activity</span><b>Number + SMS update automatically</b></div>
    </div>
  );
}
