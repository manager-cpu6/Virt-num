"use client";
import {useEffect,useState} from "react";
import TopBar from "@/components/TopBar";
import "./support.css";

type Ticket={id:string;subject:string;status:string;createdAt:string;reviewUntil:string;canSubmit:boolean};
export default function SupportPage(){
 const [channel,setChannel]=useState("email"),[contact,setContact]=useState(""),[subject,setSubject]=useState(""),[message,setMessage]=useState(""),[ticket,setTicket]=useState<Ticket|null>(null),[canSubmit,setCanSubmit]=useState(true),[loading,setLoading]=useState(true),[sending,setSending]=useState(false),[notice,setNotice]=useState(""),[error,setError]=useState("");
 async function refresh(){try{const r=await fetch("/api/support",{cache:"no-store"});const d=await r.json();if(r.ok&&d.ok){setTicket(d.ticket||null);setCanSubmit(Boolean(d.canSubmit))}}catch{}finally{setLoading(false)}}
 useEffect(()=>{void refresh()},[]);
 async function submit(e:React.FormEvent){e.preventDefault();setNotice("");setError("");setSending(true);try{const r=await fetch("/api/support",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({channel,contact,subject,message})});const d=await r.json();if(!r.ok||!d.ok){setError(d.error||"Unable to submit request.");if(d.reviewUntil){setTicket((t)=>t?{...t,reviewUntil:d.reviewUntil,canSubmit:false}:t);setCanSubmit(false)}return}setNotice(d.message);setSubject("");setMessage("");await refresh()}catch{setError("Network error. Please try again.")}finally{setSending(false)}}
 const date=(v:string)=>{try{return new Date(v).toLocaleString()}catch{return v}};
 return <div className="support-page"><TopBar title="Support" back/><section className="support-hero"><span className="support-icon">✦</span><div><span className="eyebrow">NUMELIXA CARE</span><h1>How can we help?</h1><p>Send one clear request. Our team reviews it within 24 hours.</p></div></section>
 {ticket&&!canSubmit&&<section className="support-status"><span className="support-status-dot"/><div><b>Your request is being reviewed</b><p>For fair and faster support, new requests are paused during this 24-hour review window.</p><small>Next request available: {date(ticket.reviewUntil)}</small></div></section>}
 {notice&&<div className="support-message success" role="status">{notice}</div>}{error&&<div className="support-message error" role="alert">{error}</div>}
 <form className="support-form" onSubmit={submit}><div className="support-form-heading"><h2>Contact support</h2><span>Usually reviewed within 24 hours</span></div>
 <label>Contact method</label><div className="support-channels">{[["email","Email","✉"],["whatsapp","WhatsApp","◉"],["telegram","Telegram","➤"]].map(([v,label,icon])=><button key={v} type="button" className={channel===v?"selected":""} onClick={()=>{setChannel(v);setContact("")}}><span>{icon}</span>{label}</button>)}</div>
 <label htmlFor="support-contact">{channel==="telegram"?"Telegram username":channel==="whatsapp"?"WhatsApp number (with country code)":"Email address"}</label><input id="support-contact" value={contact} onChange={e=>setContact(e.target.value)} placeholder={channel==="telegram"?"@yourusername":channel==="whatsapp"?"+252 6XX XXX XXX":"you@example.com"} required maxLength={160}/>
 <label htmlFor="support-subject">What do you need help with?</label><input id="support-subject" value={subject} onChange={e=>setSubject(e.target.value)} placeholder="e.g. Number order or wallet issue" required minLength={4} maxLength={120}/>
 <label htmlFor="support-message">Details</label><textarea id="support-message" value={message} onChange={e=>setMessage(e.target.value)} placeholder="Tell us what happened. Never include your password or verification code." required minLength={15} maxLength={3000} rows={5}/>
 <div className="support-privacy">🔒 We use your contact details only to respond to this support request. Never share passwords or OTP codes.</div>
 <button className="support-submit" type="submit" disabled={sending||loading||!canSubmit}>{sending?"Submitting…":!canSubmit?"Review window active":"Submit support request →"}</button>
 </form><p className="support-footnote">Each account can submit one support request per 24-hour review period. Please include the relevant order ID in your message when possible.</p></div>
}
