"use client";
import {useEffect,useState} from "react";
type Ticket={id:string;userId:string;userEmail:string;userName:string;channel:string;contact:string;subject:string;message:string;status:string;createdAt:string;updatedAt?:string};
function ChannelIcon({channel}:{channel:string}){
 if(channel==="whatsapp")return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20.5 11.7a8.5 8.5 0 0 1-12.6 7.4L3 20l.9-4.7A8.5 8.5 0 1 1 20.5 11.7Z"/><path d="M8.2 7.8c.3-.5.7-.4 1-.1l1 1.5c.2.3.1.6-.2.9l-.6.6c.7 1.3 1.6 2.2 2.9 2.8l.6-.7c.2-.3.6-.4.9-.2l1.5.8c.4.2.5.6.3 1-.4.8-1.1 1.2-2 1.1-3.2-.5-6.3-3.4-6.7-6.2-.1-.6.4-1.2 1.3-1.5Z"/></svg>;
 if(channel==="telegram")return <svg viewBox="0 0 24 24" aria-hidden="true"><path d="m21 3-7.3 18-3.8-7-7-3.8L21 3Z"/><path d="m10 14 4-4"/></svg>;
 return <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="5" width="18" height="14" rx="3"/><path d="m4 7 8 6 8-6"/></svg>;
}
function contactUrl(t:Ticket){if(t.channel==="whatsapp"){const n=t.contact.replace(/\D/g,"");return n?"https://wa.me/"+n:"#"}if(t.channel==="telegram"){const n=t.contact.replace(/^@/,"");return n?"https://t.me/"+n:"#"}return t.contact?"mailto:"+t.contact:"#"}
export default function AdminSupport(){
 const [tickets,setTickets]=useState<Ticket[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState(""),[busy,setBusy]=useState("");
 async function load(){setLoading(true);setError("");try{const r=await fetch("/api/admin/support",{cache:"no-store"}),d=await r.json();if(!r.ok||!d.ok)throw new Error(d.error||"Unable to load support requests.");setTickets(d.tickets||[])}catch(e){setError(e instanceof Error?e.message:"Unable to load support requests.")}finally{setLoading(false)}}
 useEffect(()=>{void load();const timer=window.setInterval(()=>void load(),20000);return()=>window.clearInterval(timer)},[]);
 async function setStatus(id:string,status:string){setBusy(id);setError("");try{const r=await fetch("/api/admin/support",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({id,status})}),d=await r.json();if(!r.ok||!d.ok)throw new Error(d.error||"Unable to update request.");if(status==="resolved"||status==="rejected")setTickets(old=>old.filter(t=>t.id!==id));else setTickets(old=>old.map(t=>t.id===id?{...t,status}:t))}catch(e){setError(e instanceof Error?e.message:"Unable to update request.")}finally{setBusy("")}}
 return <section className="admin-card admin-support nx-admin-support">
  <div className="admin-support-heading"><div><span className="nx-support-kicker">CUSTOMER CARE · LIVE INBOX</span><h2>Support requests</h2><p>Review new requests, update customers, and close solved cases. Solved requests leave this active inbox.</p></div><button className="secondary-btn" onClick={()=>void load()} disabled={loading}>↻ Refresh</button></div>
  <div className="nx-support-inbox-meta"><span><i className="nx-live-dot"/> Live inbox</span><b>{tickets.length} open {tickets.length===1?"request":"requests"}</b></div>
  {error&&<div className="error-box" role="alert">{error}</div>}
  {loading?<div className="nx-support-empty">Loading customer requests…</div>:!tickets.length?<div className="nx-support-empty"><span>✓</span><b>Inbox is clear</b><small>New customer requests will appear here automatically.</small></div>:<div className="nx-support-ticket-list">{tickets.map(t=><article className="nx-support-ticket" key={t.id}>
   <div className="nx-support-ticket-top"><div className="nx-support-ticket-icon"><ChannelIcon channel={t.channel}/></div><div className="nx-support-ticket-title"><b>{t.subject}</b><small>{t.userName||"Customer"} · {t.userEmail||"No email on file"}</small></div><span className={"nx-support-status "+(t.status==="reviewing"?"review":"new")}>{t.status==="reviewing"?"In review":"New"}</span></div>
   <p className="nx-support-ticket-message">{t.message}</p>
   <div className="nx-support-ticket-details"><span>Ticket <b>#{t.id.slice(-8).toUpperCase()}</b></span><span>Received <b>{new Date(t.createdAt).toLocaleString()}</b></span><span>Reply channel <b>{t.channel}</b></span><span>Contact <b><a className="nx-support-contact-link" href={contactUrl(t)} target={t.channel==="email"?undefined:"_blank"} rel="noopener noreferrer">{t.channel==="whatsapp"?"Open WhatsApp":t.channel==="telegram"?"Open Telegram":t.contact} ↗</a></b></span></div>
   <div className="nx-support-ticket-actions"><button className={t.status==="reviewing"?"nx-support-review-active":"nx-support-review"} disabled={busy===t.id||t.status==="reviewing"} onClick={()=>void setStatus(t.id,"reviewing")}>{busy===t.id?"Saving…":"◷ In review"}</button><button className="nx-support-solve" disabled={busy===t.id} onClick={()=>void setStatus(t.id,"resolved")}>{busy===t.id?"Sending email…":"✓ Solve & email user"}</button><button className="nx-support-reject" disabled={busy===t.id} onClick={()=>void setStatus(t.id,"rejected")}>Reject</button></div>
  </article>)}</div>}
 </section>
}
