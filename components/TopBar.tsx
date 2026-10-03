"use client";
import Link from "next/link";
import {useEffect,useState} from "react";
type TopBarProps={title?:string;back?:boolean};
type MeResponse={ok?:boolean;user?:{coins?:number}|null};
export default function TopBar({title="Numelixa",back=false}:TopBarProps){
 const[open,setOpen]=useState(false),[coins,setCoins]=useState<number|null>(null);
 useEffect(()=>{let cancelled=false;fetch("/api/me",{cache:"no-store"}).then(async r=>r.ok?(await r.json()) as MeResponse:null).then(d=>{if(!cancelled&&d?.user)setCoins(Number(d.user.coins||0))}).catch(()=>{if(!cancelled)setCoins(null)});return()=>{cancelled=true}},[]);
 return <header className={"topbar "+(back?"topbar-detail":"topbar-brand")}><div className="topbar-inner">
  {back?<Link href="/services" className="icon-btn" aria-label="Back"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.1"><path d="M15 18l-6-6 6-6"/></svg></Link>:<Link href="/" className="brand-lockup" aria-label="Numelixa home"><span className="brand-logo">N</span><span className="brand-copy"><b>Numelixa</b><small>Virtual Numbers · Global SMS</small></span></Link>}
  <div className="top-title">{back?title:""}</div>
  <div className="topbar-actions">{coins!==null?<Link href="/wallet" className="coin-pill" aria-label={"Wallet balance: "+coins.toLocaleString()+" coins"}><span className="coin-icon">◈</span><span>{coins.toLocaleString()}</span><small>coins</small></Link>:null}
  {back?<button className="icon-btn" type="button" aria-label="Filters" onClick={()=>document.getElementById("country-filters")?.scrollIntoView({behavior:"smooth",block:"center"})}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"><path d="M4 7h10M18 7h2M4 12h2M10 12h10M4 17h10M18 17h2"/><circle cx="16" cy="7" r="2"/><circle cx="8" cy="12" r="2"/><circle cx="16" cy="17" r="2"/></svg></button>:<button className="icon-btn home-menu-btn" type="button" aria-label="Open menu" aria-expanded={open} onClick={()=>setOpen(v=>!v)}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path d="M4 7h16M4 12h16M4 17h16"/></svg></button>}</div>
 </div>
 {!back&&open?<div className="top-menu"><Link href="/" onClick={()=>setOpen(false)}>Home</Link><Link href="/services" onClick={()=>setOpen(false)}>Get a number</Link><Link href="/numbers" onClick={()=>setOpen(false)}>My orders</Link><Link href="/wallet" onClick={()=>setOpen(false)}>Wallet</Link><Link href="/account" onClick={()=>setOpen(false)}>Account</Link></div>:null}
 </header>
}