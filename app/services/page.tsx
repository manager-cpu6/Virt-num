"use client";
import {useEffect,useMemo,useState} from "react";
import Link from "next/link";
import TopBar from "@/components/TopBar";
import ServiceLogo,{canonicalServiceBrand} from "@/components/ServiceLogo";

type Service={id:string;code:string;name:string};

export default function ServicesPage(){
 const[services,setServices]=useState<Service[]>([]);
 const[query,setQuery]=useState("");
 const[loading,setLoading]=useState(true);
 const[showAll,setShowAll]=useState(false);
 const[error,setError]=useState("");

 useEffect(()=>{
  let active=true;
  fetch("/api/catalog/services",{cache:"no-store",credentials:"include"})
   .then(async response=>{
    const data=await response.json();
    if(!response.ok||!data.ok)throw new Error(data.error||"Live catalog unavailable");
    if(active)setServices(Array.isArray(data.services)?data.services.filter((item:unknown):item is Service=>!!item&&typeof item==="object"&&typeof (item as Service).id==="string"&&typeof (item as Service).name==="string"):[]);
   })
   .catch(reason=>{if(active)setError(reason instanceof Error?reason.message:"Unable to load live services");})
   .finally(()=>{if(active)setLoading(false);});
  return()=>{active=false;};
 },[]);

 const filtered=useMemo(()=>{
  const q=query.trim().toLocaleLowerCase();
  const rows=services.filter(item=>!q||(item.name+" "+item.id+" "+item.code).toLocaleLowerCase().includes(q));
  const popularOrder=["whatsapp","telegram","tiktok","instagram","facebook","google","gmail","youtube"];
  return rows.sort((a,b)=>{
   const aBrand=canonicalServiceBrand(a.id,a.name),bBrand=canonicalServiceBrand(b.id,b.name);
   const aRank=popularOrder.indexOf(aBrand),bRank=popularOrder.indexOf(bBrand);
   const ar=aRank<0?popularOrder.length:aRank,br=bRank<0?popularOrder.length:bRank;
   return ar-br||a.name.localeCompare(b.name,undefined,{sensitivity:"base"});
  });
 },[services,query]);
 const visible=query.trim()||showAll?filtered:filtered.slice(0,16);

 return <div className="services-page">
  <TopBar/>
  <section className="market-hero">
   <div className="market-hero-copy">
    <span className="eyebrow">NUMELIXA · SERVICE CATALOG</span>
    <h1>Choose a service.<br/><em>Start with clarity.</em></h1>
    <p>Browse the services currently returned by the Numelixa catalog. Choose a service to see country availability and live pricing before you purchase.</p>
    <div className="market-stats">
     <span><b>{loading?"—":services.length.toLocaleString()}</b> catalog services</span>
     <span><b>Live</b> country availability</span>
     <span><b>USD</b> price display</span>
    </div>
   </div>
   <div className="market-globe" aria-hidden="true">◎</div>
  </section>

  <div className="service-search-box">
   <span className="search-icon" aria-hidden="true">⌕</span>
   <input value={query} onChange={event=>setQuery(event.target.value)} placeholder="Search services by name or ID…" autoComplete="off" aria-label="Search services"/>
   {query&&<button type="button" className="search-clear" onClick={()=>setQuery("")} aria-label="Clear search">×</button>}
  </div>

  <div className="section-head service-section-head">
   <div><h2>{query?"Search results":"Available services"}</h2><span className="service-count">{loading?"Loading live catalog…":query?filtered.length.toLocaleString()+" matching services":services.length.toLocaleString()+" services returned by catalog"}</span></div>
   {!query&&!loading&&!error&&filtered.length>16&&<button className="view-all-btn" onClick={()=>setShowAll(value=>!value)}>{showAll?"Show fewer":"View all ("+filtered.length+")"} <span>→</span></button>}
  </div>

  {loading?<div className="service-loading" role="status">Loading live services…</div>
   :error?<div className="helper-card" role="alert"><b>Live catalog unavailable</b><span>{error}. Please retry in a moment.</span><button className="secondary-btn" onClick={()=>{setLoading(true);setError("");fetch("/api/catalog/services",{cache:"no-store",credentials:"include"}).then(async response=>{const data=await response.json();if(!response.ok||!data.ok)throw new Error(data.error||"Live catalog unavailable");setServices(Array.isArray(data.services)?data.services:[])}).catch(reason=>setError(reason instanceof Error?reason.message:"Unable to load live services")).finally(()=>setLoading(false));}}>Retry</button></div>
   :<div className="service-grid">{visible.map(item=><Link key={item.id} className="service-card" href={"/countries?service="+encodeURIComponent(item.id)+"&name="+encodeURIComponent(item.name)}><ServiceLogo id={item.id} name={item.name}/><div><b>{item.name}</b><small>View countries and live price</small></div><span className="chevron" aria-hidden="true">›</span></Link>)}</div>}

  {!loading&&!error&&!filtered.length&&<div className="helper-card"><b>No matching service</b><span>Try a different service name or identifier.</span></div>}
  
 </div>;
}
