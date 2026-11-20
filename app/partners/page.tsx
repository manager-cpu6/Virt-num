"use client";
import Link from "next/link";
import {useState} from "react";

const opportunities=[
 {title:"Business partnerships",description:"Discuss business use cases, platform collaboration and service requirements.",category:"business"},
 {title:"Technical partnerships",description:"Talk through infrastructure, integration requirements and technical collaboration.",category:"technical"},
 {title:"API partnerships",description:"Explore production API access, integration design and developer requirements.",category:"api"},
 {title:"Reseller opportunities",description:"Ask about reseller arrangements and whether a suitable programme is available.",category:"reseller"},
 {title:"Enterprise enquiries",description:"Discuss higher-volume requirements, operational needs and enterprise use cases.",category:"enterprise"}
];
export default function PartnersPage(){
 const[name,setName]=useState(""),[email,setEmail]=useState(""),[company,setCompany]=useState(""),[category,setCategory]=useState("business"),[message,setMessage]=useState(""),[website,setWebsite]=useState("");
 const[busy,setBusy]=useState(false),[error,setError]=useState(""),[success,setSuccess]=useState(""),[reference,setReference]=useState("");
 function choose(value:string){setCategory(value);document.getElementById("partner-enquiry")?.scrollIntoView({behavior:"smooth",block:"start"});}
 async function submit(e:React.FormEvent){
  e.preventDefault();setBusy(true);setError("");setSuccess("");
  try{
   const response=await fetch("/api/partner-inquiries",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name,email,company,category,message,website})});
   const data=await response.json().catch(()=>({}));
   if(!response.ok||!data.ok)throw new Error(data.error||"Your enquiry could not be submitted.");
   setReference(data.reference||"");setSuccess(data.message||"Your enquiry has been recorded.");setName("");setEmail("");setCompany("");setMessage("");setWebsite("");
  }catch(e){setError(e instanceof Error?e.message:"Connection problem. Please try again.");}
  finally{setBusy(false);}
 }
 return <main className="nx-guide-page nx-partners-page">
  <header className="nx-guide-nav"><Link href="/" className="nx-guide-brand"><img src="/numelixa-brand.svg" alt="" width="34" height="34"/> NUMELIXA</Link><nav><Link href="/developers/docs">API documentation</Link><Link href="/clients">For clients</Link><Link href="/support">Support</Link></nav></header>
  <section className="nx-guide-hero"><span className="nx-guide-kicker">NUMELIXA · PARTNERS</span><h1>Build something useful together.</h1><p>We welcome relevant business, technical, API, reseller and enterprise enquiries. Tell us what you are building and what kind of collaboration you have in mind.</p></section>
  <section className="nx-partner-grid">{opportunities.map(item=><article key={item.category}><span className="nx-partner-icon" aria-hidden="true">↗</span><h2>{item.title}</h2><p>{item.description}</p><button type="button" onClick={()=>choose(item.category)}>Start an enquiry <span>→</span></button></article>)}</section>
  <section className="nx-partner-contact" id="partner-enquiry">
   <div><span className="nx-guide-kicker">OFFICIAL PARTNERSHIP CONTACT</span><h2>Tell us about your project</h2><p>Partnership enquiries are reviewed by the Numelixa team. Your message is routed to support@numelixa.com with a reference number.</p><strong>support@numelixa.com</strong></div>
   <form className="nx-partner-form" onSubmit={submit}>
    {error&&<div role="alert" className="nx-partner-alert error">{error}</div>}
    {success&&<div role="status" className="nx-partner-alert success">{success}{reference&&<span>Reference: {reference}</span>}</div>}
    <div className="nx-partner-form-grid">
     <label>Your name<input value={name} onChange={e=>setName(e.target.value)} required minLength={2} maxLength={100} placeholder="Full name"/></label>
     <label>Work email<input type="email" value={email} onChange={e=>setEmail(e.target.value)} required maxLength={160} placeholder="you@company.com"/></label>
     <label>Company (optional)<input value={company} onChange={e=>setCompany(e.target.value)} maxLength={120} placeholder="Company or organization"/></label>
     <label>Enquiry type<select value={category} onChange={e=>setCategory(e.target.value)}><option value="business">Business partnership</option><option value="technical">Technical partnership</option><option value="api">API integration</option><option value="reseller">Reseller opportunity</option><option value="enterprise">Enterprise</option><option value="other">Other</option></select></label>
    </div>
    <label className="nx-partner-message">How can we work together?<textarea value={message} onChange={e=>setMessage(e.target.value)} required minLength={20} maxLength={4000} rows={6} placeholder="Describe your organization, project, expected integration or partnership requirements."/></label>
    <label className="nx-partner-honeypot" aria-hidden="true">Website<input tabIndex={-1} autoComplete="off" value={website} onChange={e=>setWebsite(e.target.value)}/></label>
    <button className="nx-partner-submit" type="submit" disabled={busy}>{busy?"Submitting…":"Submit partnership enquiry"} <span>→</span></button>
    <small>Your details are used only to review and respond to this enquiry. Do not include passwords, OTP codes or payment credentials.</small>
   </form>
  </section>
 </main>;
}
