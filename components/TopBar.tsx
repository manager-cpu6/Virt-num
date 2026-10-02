"use client";
import Link from "next/link";
export default function TopBar({title="Numelixa",back=false}:{title?:string;back?:boolean}){
 return <header className="topbar">
  {back?<Link href="/" className="icon-btn" aria-label="Back">‹</Link>:<Link href="/" className="brand-mark">N</Link>}
  <div className="top-title">{title}</div>
  {!back?<Link href="/account" className="icon-btn" aria-label="Account">●</Link>:<div className="top-spacer"/>}
 </header>;
}