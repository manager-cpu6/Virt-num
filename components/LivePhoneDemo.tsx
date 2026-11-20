"use client";

import {useEffect,useState} from "react";

const messages=[
 {service:"WhatsApp",sender:"WhatsApp",icon:"◉",tone:"green",code:"482 193",body:"Your WhatsApp verification code is 482 193. Do not share this code with anyone.",time:"Just now"},
 {service:"Telegram",sender:"Telegram",icon:"➤",tone:"blue",code:"731 604",body:"Telegram code: 731604. This code can be used to sign in to your account.",time:"Just now"},
 {service:"Snapchat",sender:"Snapchat",icon:"👻",tone:"yellow",code:"905 218",body:"905218 is your Snapchat verification code. It expires in 5 minutes.",time:"1 min ago"},
 {service:"Instagram",sender:"Instagram",icon:"◎",tone:"pink",code:"164 827",body:"164827 is your Instagram code. Enter it to confirm your account.",time:"Just now"},
 {service:"Google",sender:"Google",icon:"G",tone:"multi",code:"608 351",body:"G-608351 is your Google verification code. Don't share it with anyone.",time:"2 min ago"},
 {service:"Account verification",sender:"Verify",icon:"✓",tone:"violet",code:"357 942",body:"Your one-time verification code is 357942. It is valid for 10 minutes.",time:"Just now"}
];

export default function LivePhoneDemo(){
 const [active,setActive]=useState(0);
 const [transition,setTransition]=useState<"in"|"out">("in");
 const [copied,setCopied]=useState<"number"|"code"|null>(null);
 useEffect(()=>{
  const timer=window.setInterval(()=>{
   setTransition("out");
   window.setTimeout(()=>{setActive(value=>(value+1)%messages.length);setTransition("in");},260);
  },5200);
  return ()=>window.clearInterval(timer);
 },[]);
 const message=messages[active];
 async function copy(value:string,kind:"number"|"code"){
  try{await navigator.clipboard.writeText(value);setCopied(kind);window.setTimeout(()=>setCopied(null),1500);}catch{setCopied(null);}
 }
 return <div className="nx-live-demo" aria-label="Numelixa mobile interface with rotating sample SMS messages">
  <div className="nx-showcase-orbit nx-orbit-one"/><div className="nx-showcase-orbit nx-orbit-two"/>
  <div className="nx-signal-dot nx-signal-a"/><div className="nx-signal-dot nx-signal-b"/><div className="nx-signal-dot nx-signal-c"/>
  <div className="nx-showcase-float nx-float-top"><span className="nx-float-icon">↗</span><span><b>SMS received</b><small>Message inbox</small></span><i/></div>
  <div className="nx-live-phone">
   <div className="nx-live-hardware"><span/></div>
   <div className="nx-live-screen">
    <div className="nx-live-status"><span>9:41</span><span className="nx-status-right">● ● ● <b>5G</b> ▰</span></div>
    <div className="nx-live-appbar"><span className="nx-live-logo"><img src="/numelixa-brand.svg" alt="" width="27" height="27"/></span><span><b>Numelixa</b><small>Virtual numbers</small></span><i>•••</i></div>
    <div className="nx-phone-greeting"><span>YOUR WORKSPACE</span><b>Active number</b></div>
    <div className="nx-live-number">
     <div className="nx-number-top"><span>UNITED STATES</span><i><b/> ACTIVE</i></div>
     <strong>+1 (202) 555-0148</strong>
     <div className="nx-number-bottom"><span>WhatsApp · United States</span><button type="button" onClick={()=>copy("+12025550148","number")}>{copied==="number"?"Copied ✓":"Copy number"}</button></div>
    </div>
    <div className="nx-inbox-heading"><span><b>Incoming SMS</b><small>Messages for this number</small></span><i>INBOX <b>01</b></i></div>
    <div className={"nx-sms-message "+(transition==="out"?"is-leaving":"is-entering")} aria-live="polite" aria-atomic="true">
     <div className="nx-sms-meta"><span className={"nx-sms-service-icon "+message.tone}>{message.icon}</span><span><b>{message.service}</b><small>{message.sender} · {message.time}</small></span><em>Sample SMS</em></div>
     <p>{message.body.split(message.code.replace(" ","")).length>1?message.body.replace(message.code.replace(" ",""),""):message.body}</p>
     <div className="nx-code-row"><span>VERIFICATION CODE</span><strong key={message.code}>{message.code}</strong></div>
     <button className="nx-copy-code" type="button" onClick={()=>copy(message.code.replace(" ",""),"code")}>{copied==="code"?"Code copied ✓":"Copy verification code"} <span>↗</span></button>
    </div>
    <div className="nx-sms-rotation"><div className="nx-sms-dots" aria-label={"Sample message "+(active+1)+" of 6"}>{messages.map((item,index)=><span key={item.service} className={index===active?"active":""}/>)}</div><span>{String(active+1).padStart(2,"0")} / 06</span></div>
    <div className="nx-phone-nav"><span className="active"><b>⌂</b>Home</span><span><b>◎</b>Numbers</span><span><b>▣</b>Wallet</span><span><b>◷</b>Orders</span></div>
   </div>
  </div>
  <div className="nx-showcase-float nx-float-bottom"><span className="nx-float-check">✓</span><span><b>Verification inbox</b><small>Clear status. One place.</small></span></div>
  <div className="nx-showcase-caption"><span className="nx-caption-pulse"/> Six sample messages · Rotates automatically</div>
 </div>;
}
