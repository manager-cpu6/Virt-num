"use client";
import {useEffect,useMemo,useState} from "react";
import Link from "next/link";
import ServiceLogo from "@/components/ServiceLogo";
type Service={id:string;code?:string;name:string};
export default function HomeServiceDiscovery(){
 const [services,setServices]=useState<Service[]>([]),[query,setQuery]=useState(""),[loading,setLoading]=useState(true),[error,setError]=useState("");
 useEffect(()=>{let active=true;fetch("/api/catalog/services",{cache:"no-store"}).then(async r=>{const d=await r.json();if(!r.ok||!d.ok)throw new Error(d.error||"Live service catalog unavailable.");if(active)setServices(Array.isArray(d.services)?d.services.filter((x:unknown):x is Service=>!!x&&typeof x==="object"&&typeof (x as Service).id==="string"&&typeof (x as Service).name==="string"):[]);}).catch(e=>{if(active)setError(e instanceof Error?e.message:"Unable to load live services.");}).finally(()=>{if(active)setLoading(false)});return()=>{active=false}},[]);
 const filtered=useMemo(()=>{const q=query.trim().toLowerCase();return services.filter(s=>!q||(s.name+" "+s.id+" "+(s.code||"")).toLowerCase().includes(q));},[services,query]);
 return <section className="nx-home-discovery" id="home-services">
  <div className="nx-home-section-heading"><div><span>LIVE SERVICE CATALOG</span><h2>Find the service you need.</h2><p>Services below are loaded from the current Numelixa catalog. Country stock and price are checked on the next step.</p></div><Link href="/services">Browse all services <b>→</b></Link></div>
  <label className="nx-home-service-search"><span>⌕</span><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search WhatsApp, Telegram, Google…" aria-label="Search live services"/>{query&&<button type="button" onClick={()=>setQuery("")} aria-label="Clear search">×</button>}</label>
  {loading?<div className="nx-home-service-state">Loading the live catalog…</div>:error?<div className="nx-home-service-state error">{error} <Link href="/services">Open catalog</Link></div>:filtered.length===0?<div className="nx-home-service-state">No matching services in the current catalog.</div>:
   <div className="nx-home-service-grid">{filtered.slice(0,8).map(s=><Link href={"/countries?service="+encodeURIComponent(s.id)+"&name="+encodeURIComponent(s.name)} key={s.id} className="nx-home-service-card"><ServiceLogo id={s.id} name={s.name} className="service-icon"/><span><b>{s.name}</b><small>Check live countries & pricing</small></span><i>↗</i></Link>)}</div>}
  <div className="nx-home-discovery-foot"><span>Availability is confirmed before purchase.</span><Link href="/services">Explore complete catalog</Link></div>
 </section>;
}
