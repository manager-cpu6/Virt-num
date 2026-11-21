"use client";
import {useEffect,useState} from "react";

const activity=[
 {flag:"🇺🇸",country:"United States",service:"WhatsApp",number:"+1 ••• ••• 0142",code:"482 916"},
 {flag:"🇬🇧",country:"United Kingdom",service:"Telegram",number:"+44 •••• ••• 123",code:"731 405"},
 {flag:"🇩🇪",country:"Germany",service:"Discord",number:"+49 ••• •••• 4821",code:"206 874"},
 {flag:"🇨🇦",country:"Canada",service:"TikTok",number:"+1 ••• ••• 0186",code:"593 127"},
 {flag:"🇫🇷",country:"France",service:"Google",number:"+33 •• •• •• 42",code:"814 260"},
 {flag:"🇦🇺",country:"Australia",service:"Microsoft",number:"+61 ••• ••• 159",code:"367 508"}
];

export default function LivePhoneDemo(){
 const[index,setIndex]=useState(0);
 useEffect(()=>{
  const timer=window.setInterval(()=>setIndex(current=>(current+1)%activity.length),3200);
  return()=>window.clearInterval(timer);
 },[]);
 const item=activity[index];
 return <div className="nx-live-demo" aria-label="Rotating sample of a Numelixa number and SMS experience">
  <div className="nx-live-glow"/>
  <div className="nx-live-badge"><span/> SAMPLE NUMBER ACTIVITY</div>
  <div className="nx-live-phone">
   <div className="nx-live-speaker"/>
   <div className="nx-live-screen">
    <div className="nx-live-status"><span>9:41</span><span>●●● 5G</span></div>
    <div className="nx-live-appbar"><span className="nx-live-logo"><img src="/numelixa-brand.svg" alt="" width="24" height="24"/></span><b>Numelixa</b><i>•••</i></div>
    <div className="nx-live-number" key={"number-"+index}>
     <small>NUMBER ACTIVITY</small>
     <div className="nx-live-number-row"><span className="nx-live-flag" role="img" aria-label={item.country+" flag"}>{item.flag}</span><span className="nx-live-country"><small>COUNTRY</small><b>{item.country}</b></span><strong>{item.number}</strong></div>
     <span><i/> {item.service} · {item.country}</span>
    </div>
    <div className="nx-live-sms" key={"sms-"+index}>
     <div className="nx-live-sms-head"><b>SMS received</b><span>SAMPLE</span></div>
     <strong>{item.service} verification code</strong>
     <div className="nx-live-code" aria-label={"Sample code "+item.code}>{item.code.split("").filter(char=>char!==" ").map((digit,i)=><b key={i}>{digit}</b>)}</div>
     <p>Your verification message appears here when received.</p>
     <small>Sample message · updates automatically</small>
    </div>
    <div className="nx-live-actions"><span>Number updates</span><span>Code updates</span></div>
   </div>
  </div>
  <div className="nx-live-caption"><span><i/> Rotating sample</span><b>Example numbers and one-time codes</b></div>
 </div>;
}
