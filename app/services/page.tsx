"use client";
import {useEffect,useMemo,useState} from "react";
import Link from "next/link";
import TopBar from "@/components/TopBar";

type S={id?:string;code?:string;service?:string;name?:string;icon?:string};
const popular=["wa","tg","go","fb","ig","lf","tw","sn","vi","ym","ds","am"];
const logo:Record<string,string>={wa:"whatsapp",tg:"telegram",go:"google",fb:"facebook",ig:"instagram",lf:"tiktok",tw:"x",sn:"snapchat",vi:"viber",ym:"yahoo",ds:"discord",am:"amazon",ms:"microsoft",apple:"apple",sg:"signal",wb:"wechat"};

function AppLogo({id,name}:{id:string;name:string}){const slug=logo[id.toLowerCase()];return <span className={"service-icon service-icon-"+id.toLowerCase()}>{slug?<img src={"https://cdn.simpleicons.org/"+slug} alt="" loading="lazy" onError={e=>{e.currentTarget.style.display="none"}}/>:name.slice(0,1).toUpperCase()}</span>}

export default function ServicesPage(){
 const[s,setS]=useState<S[]>([]),[q,setQ]=useState(""),[loading,setLoading]=useState(true),[showAll,setShowAll]=useState(false);
 useEffect(()=>{fetch("/api/catalog/services",{cache:"no-store"}).then(r=>r.json()).then(d=>setS(Array.isArray(d.services)?d.services:[])).catch(()=>setS([])).finally(()=>setLoading(false))},[]);
 const filtered=useMemo(()=>{const query=q.trim().toLowerCase();if(query)return s.filter(x=>String(x.name||x.code||x.id||"").toLowerCase().includes(query));if(showAll)return s;const p=s.filter(x=>popular.includes(String(x.code||x.id||"").toLowerCase()));return p.length?p:s.slice(0,12)},[s,q,showAll]);
 return <div className="services-page">
  <TopBar/>
  <section className="market-hero"><div className="market-hero-copy"><span className="eyebrow">GLOBAL SMS SERVICES</span><h1>Get Virtual Numbers<br/>from <em>212+ Countries</em></h1><p>Receive SMS online for verification, signups and more.</p><div className="market-stats"><span>◉ <b>212+</b> Countries</span><span>▱ <b>1000+</b> Services</span><span>ϟ <b>Instant</b> Delivery</span></div></div><div className="market-globe" aria-hidden="true">🌎</div></section>
  <div className="form-card service-search"><span className="search-icon">⌕</span><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search service…" autoComplete="off"/></div>
  <div className="section-head service-section-head"><h2>{q?"Search results":"Popular Services"}</h2>{!q&&s.length>12&&<button className="view-all-btn" onClick={()=>setShowAll(v=>!v)}>{showAll?"Show popular":"View all ("+s.length+"+)"} <span>→</span></button>}</div>
  {loading?<div className="service-loading">Loading services…</div>:<div className="service-grid">{filtered.map((x,i)=>{const name=x.name||x.code||"Service";const id=String(x.code||x.id||name).toLowerCase();return <Link key={id+i} className="service-card" href={"/countries?service="+encodeURIComponent(id)}><AppLogo id={id} name={name}/><div><b>{name}</b><small>Global · SMS verification</small></div><span className="chevron">›</span></Link>})}</div>}
  {!loading&&!filtered.length&&<div className="helper-card"><b>No matching service</b><span>Try another search.</span></div>}
  <div className="catalog-trust"><span className="trust-icon">✓</span><div><b>Live Prices & Availability</b><small>Prices and stock are updated in real-time.</small></div></div>
 </div>;
}