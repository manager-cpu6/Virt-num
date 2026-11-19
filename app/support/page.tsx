"use client";
import {useEffect,useState} from "react";

type Ticket={id:string;subject:string;status:string;createdAt:string;updatedAt?:string};
function ChannelIcon({name}:{name:string}){
 if(name==="whatsapp")return <img src="https://cdn.simpleicons.org/whatsapp/25D366" alt="" width="23" height="23"/>;
 if(name==="telegram")return <img src="https://cdn.simpleicons.org/telegram/26A5E4" alt="" width="23" height="23"/>;
 return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="3"/><path d="m4 7 8 6 8-6"/></svg>;
}
export default function SupportPage(){
 const [channel,setChannel]=useState("email"),[contact,setContact]=useState(""),[subject,setSubject]=useState(""),[message,setMessage]=useState(""),[ticket,setTicket]=useState<Ticket|null>(null),[needsLogin,setNeedsLogin]=useState(false),[loading,setLoading]=useState(true),[sending,setSending]=useState(false),[notice,setNotice]=useState(""),[error,setError]=useState("");
 async function refresh(silent=false){
  if(!silent)setLoading(true);
  try{const r=await fetch("/api/support",{cache:"no-store",credentials:"include"});const d=await r.json();if(r.ok&&d.ok){setTicket(d.ticket||null);setError("")}else if(r.status===401){setNeedsLogin(true);setError("");}else if(!silent)setError(d.error||"Support is temporarily unavailable.");}
  catch{if(!silent)setError("Connection problem. Please try again.");}
  finally{if(!silent)setLoading(false)}
 }
 useEffect(()=>{void refresh();const timer=window.setInterval(()=>void refresh(true),15000);return()=>window.clearInterval(timer)},[]);
 async function submit(e:React.FormEvent){
  e.preventDefault();setNotice("");setError("");setSending(true);
  try{const r=await fetch("/api/support",{method:"POST",headers:{"Content-Type":"application/json"},credentials:"include",body:JSON.stringify({channel,contact,subject,message})});const d=await r.json();if(!r.ok||!d.ok){if(r.status===401){setNeedsLogin(true);setError("Sign in to your Numelixa account before submitting a support request.");return;}setError(d.error||"Your request could not be sent.");return;}setNotice("Your request was sent successfully. Keep the ticket number below for reference.");setSubject("");setMessage("");await refresh();}
  catch{setError("Connection problem. Your request was not confirmed. Please try again.");}
  finally{setSending(false)}
 }
 const contactLabel=channel==="telegram"?"Telegram username":channel==="whatsapp"?"WhatsApp number with country code":"Email address";
 const placeholder=channel==="telegram"?"@yourusername":channel==="whatsapp"?"+252 6XX XXX XXX":"you@example.com";
 const status=ticket?.status==="reviewing"?"In review":"Received";
 return <main className="nx-support-page">
  <header className="nx-support-header">
   <a className="nx-support-brand" href="https://www.numelixa.com/dashboard"><span className="nx-support-logo"><img src="https://numelixa.com/numelixa-brand.svg" alt="Numelixa logo"/></span><span><b>Numelixa</b><small>Customer Support · We're here to help</small></span></a>
   <a className="nx-support-account" href="https://www.numelixa.com/dashboard">Back to account <span>↗</span></a>
  </header>
  <section className="nx-support-intro">
   <span className="nx-support-kicker"><i/> CUSTOMER SUPPORT</span>
   <h1>How can we help?</h1>
   <p>Send us a message and our team will review your request. You can track its progress here.</p>
  </section>
  {notice&&<div className="nx-support-alert success" role="status"><b>✓ Request sent</b><span>{notice}</span></div>}
  {error&&<div className="nx-support-alert error" role="alert"><b>We couldn't complete that</b><span>{error}</span></div>}
  <div className="nx-support-layout">
   <section className="nx-support-panel">
    {needsLogin?<section className="nx-support-login"><span className="nx-support-login-icon"><svg viewBox="0 0 24 24"><path d="M12 3 4 6v5c0 5 3.5 8.5 8 10 4.5-1.5 8-5 8-10V6l-8-3Z"/><path d="M12 11v5M9.5 13.5h5"/></svg></span><span className="nx-support-kicker">ACCOUNT SIGN-IN REQUIRED</span><h2>Sign in to contact Support</h2><p>Your requests are linked to your Numelixa account so you can track updates and keep your information protected.</p><a href="https://www.numelixa.com/login?next=%2Fsupport">Sign in to continue <span>→</span></a></section>:ticket?<div className="nx-support-active">
      <div className="nx-support-active-head"><span className="nx-support-ticket-icon"><svg viewBox="0 0 24 24"><path d="M5 4h14v16H5zM8 8h8M8 12h8M8 16h5"/></svg></span><div><span className="nx-support-kicker">YOUR OPEN REQUEST</span><h2>{ticket.subject}</h2><small>Ticket #{ticket.id.slice(-8).toUpperCase()}</small></div><span className={"nx-support-status "+(ticket.status==="reviewing"?"review":"received")}>{status}</span></div>
      <div className="nx-support-progress"><div className="done"><i>✓</i><b>Received</b></div><span className="line"/><div className={ticket.status==="reviewing"?"current":""}><i>{ticket.status==="reviewing"?"2":"•"}</i><b>In review</b></div><span className="line"/><div><i>3</i><b>Solved</b></div></div>
      <p className="nx-support-muted">We’ll update this page automatically when the team reviews your request. A solved request is removed from your active list.</p>
      <button className="nx-support-secondary" type="button" onClick={()=>void refresh()}>↻ Refresh status</button>
    </div>:<form className="nx-support-form" onSubmit={submit}>
      <div className="nx-support-form-title"><div><span className="nx-support-kicker">SEND A REQUEST</span><h2>Tell us what happened</h2><p>Choose how we can reach you, then describe the issue clearly.</p></div><span className="nx-support-secure"><svg viewBox="0 0 24 24"><rect x="5" y="10" width="14" height="11" rx="2"/><path d="M8 10V7a4 4 0 0 1 8 0v3"/></svg> Private</span></div>
      <label>Preferred contact method</label>
      <div className="nx-support-channels">
       {(["email","whatsapp","telegram"] as const).map(v=><button type="button" key={v} className={channel===v?"selected":""} onClick={()=>{setChannel(v);setContact("")}}><span className={"nx-support-channel-icon "+v}><ChannelIcon name={v}/></span><span><b>{v==="email"?"Email":v==="whatsapp"?"WhatsApp":"Telegram"}</b><small>{v==="email"?"Get updates by email":v==="whatsapp"?"Reach you by phone":"Reach you by username"}</small></span><i className="nx-support-radio"/></button>)}
      </div>
      <label htmlFor="support-contact">{contactLabel}</label><input id="support-contact" value={contact} onChange={e=>setContact(e.target.value)} placeholder={placeholder} required maxLength={160}/>
      <label htmlFor="support-subject">What do you need help with?</label><input id="support-subject" value={subject} onChange={e=>setSubject(e.target.value)} placeholder="Example: My payment has not arrived" required minLength={4} maxLength={120}/>
      <label htmlFor="support-message">Describe the issue</label><textarea id="support-message" value={message} onChange={e=>setMessage(e.target.value)} placeholder="Tell us what happened, when it happened, and include an order or payment reference if you have one. Never include your password or OTP code." required minLength={15} maxLength={3000} rows={6}/>
      <div className="nx-support-form-foot"><span><svg viewBox="0 0 24 24"><path d="M12 3 4 6v5c0 5 3.5 8.5 8 10 4.5-1.5 8-5 8-10V6l-8-3Z"/><path d="m9 12 2 2 4-4"/></svg>Your details are only used to resolve this request.</span><small>{message.length}/3000</small></div>
      <button className="nx-support-submit" type="submit" disabled={sending||loading}>{sending?"Sending request…":"Send support request"} <span>→</span></button>
    </form>}
   </section>
   <aside className="nx-support-sidebar">
    <section className="nx-support-contact-card">
     <span className="nx-support-kicker">OFFICIAL CONTACT OPTIONS</span>
     <div className="nx-support-contact-row"><span className="nx-support-contact-icon">✉</span><div><b>support@numelixa.com</b><small>General support and policy enquiries</small></div><button type="button" onClick={async()=>{try{await navigator.clipboard.writeText("support@numelixa.com")}catch{}}} aria-label="Copy support email">Copy</button></div>
     <a className="nx-support-contact-row" href="https://wa.me/252907868526" target="_blank" rel="noreferrer"><span className="nx-support-contact-icon whatsapp">◉</span><div><b>WhatsApp Support</b><small>+252 907 868526</small></div><i>↗</i></a>
     <a className="nx-support-contact-row" href="https://support.numelixa.com/" target="_blank" rel="noreferrer"><span className="nx-support-contact-icon">?</span><div><b>Online Help Center</b><small>Official support portal</small></div><i>↗</i></a>
     <div className="nx-support-contact-links"><a href="/clients">For Clients</a><a href="/faq">Frequently asked questions</a><a href="/partners">For Partners</a></div>
    </section>
    <section className="nx-support-help-card"><span className="nx-support-help-icon"><svg viewBox="0 0 24 24"><path d="M12 3 4 6v5c0 5 3.5 8.5 8 10 4.5-1.5 8-5 8-10V6l-8-3Z"/><path d="m9 12 2 2 4-4"/></svg></span><h3>Your account is protected</h3><p>Never share your password, one-time code, recovery code or full bank-card details with anyone.</p></section>
    <section className="nx-support-help-card nx-support-steps"><span className="nx-support-kicker">WHAT HAPPENS NEXT</span><div><i>1</i><span><b>Request received</b><small>Your ticket is saved securely.</small></span></div><div><i>2</i><span><b>Team review</b><small>We investigate and update the status.</small></span></div><div><i>3</i><span><b>Issue solved</b><small>We send a confirmation email when possible.</small></span></div></section>
   </aside>
  </div>
  <footer className="nx-support-footer"><span>© {new Date().getFullYear()} Numelixa</span><span>Customer Support · Secure account assistance</span></footer>
 </main>;
}
