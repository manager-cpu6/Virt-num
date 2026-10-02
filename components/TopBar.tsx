"use client";
import Link from "next/link";
export default function TopBar({title="Numelixa",back=false}:{title?:string;back?:boolean}){
 return <header className="topbar">
  {back?<Link href="/" className="icon-btn" aria-label="Back"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"><path d="M15 18l-6-6 6-6"/></svg></Link>:<Link href="/" className="brand-mark">N</Link>}
  <div className="top-title">{title}</div>
  {!back?<Link href="/account" className="icon-btn" aria-label="Account"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9"><circle cx="12" cy="8" r="3.2"/><path d="M5.5 19c.9-3.1 3-4.7 6.5-4.7s5.6 1.6 6.5 4.7"/></svg></Link>:<div className="top-spacer"/>}
 </header>;
}