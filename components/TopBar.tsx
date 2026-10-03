"use client";
import Link from "next/link";

export default function TopBar({title="Numelixa",back=false}:{title?:string;back?:boolean}){
 return <header className={"topbar "+(back?"topbar-detail":"topbar-brand")}>
  {back?<Link href="/services" className="icon-btn" aria-label="Back"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1"><path d="M15 18l-6-6 6-6"/></svg></Link>:<Link href="/" className="brand-lockup" aria-label="Numelixa home"><span className="brand-logo">N</span><span className="brand-copy"><b>Numelixa</b><small>Virtual Numbers · Global SMS</small></span></Link>}
  <div className="top-title">{back?title:""}</div>
  {back?<button className="icon-btn" type="button" aria-label="Filters" onClick={()=>document.getElementById("country-filters")?.scrollIntoView({behavior:"smooth",block:"center"})}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 7h10M18 7h2M4 12h2M10 12h10M4 17h10M18 17h2"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="12" r="2"/><circle cx="16" cy="17" r="2"/></svg></button>:<Link className="menu-btn" href="/account" aria-label="Account menu"><span></span><span></span><span></span></Link>}
 </header>;
}