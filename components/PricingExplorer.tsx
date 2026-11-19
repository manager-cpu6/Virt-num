"use client";
import {useEffect,useMemo,useState} from "react";

export default function PricingExplorer(){
 const [services,setServices]=useState<any[]>([]);
 const [service,setService]=useState("");
 const [countries,setCountries]=useState<any[]>([]);
 const [loading,setLoading]=useState(true);
 const [error,setError]=useState("");
 const [query,setQuery]=useState("");
 useEffect(()=>{fetch("/api/catalog/services",{cache:"no-store"}).then(async r=>{const d=await r.json();if(!r.ok||!d.ok)throw new Error(d.error||"Live services are unavailable.");const rows=Array.isArray(d.services)?d.services:[];setServices(rows);if(rows.length)setService(String(rows[0].id||rows[0].code||rows[0].name||""));}).catch(e=>setError(e.message||"Unable to load services."));},[]);
 useEffect(()=>{if(!service)return;let active=true;setLoading(true);setError("");fetch("/api/catalog/countries?service="+encodeURIComponent(service),{cache:"no-store"}).then(async r=>{const d=await r.json();if(!r.ok||!d.ok)throw new Error(d.error||"Live country prices are unavailable.");if(active)setCountries(Array.isArray(d.countries)?d.countries:[]);}).catch(e=>{if(active){setCountries([]);setError(e.message||"Unable to load prices.");}}).finally(()=>{if(active)setLoading(false)});return()=>{active=false}},[service]);
 const visible=useMemo(()=>countries.filter(c=>String(c.name||c.country||c.id||"").toLowerCase().includes(query.toLowerCase())),[countries,query]);
 const selected=services.find(x=>String(x.id||x.code||x.name||"")===service);
 return <section className="nx-pricing-explorer">
  <div className="nx-pricing-controls"><label>Choose a service<select value={service} onChange={e=>setService(e.target.value)}>{services.map((x:any)=><option key={String(x.id||x.code||x.name)} value={String(x.id||x.code||x.name)}>{x.name||x.title||x.id}</option>)}</select></label><label>Find a country<input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search country…"/></label></div>
  <div className="nx-pricing-meta"><b>{selected?.name||selected?.title||"Live pricing"}</b><span>{loading?"Loading live availability…":visible.length+" countries with stock"}</span></div>
  {error&&<div className="nx-pricing-error">{error}</div>}
  {loading?<div className="nx-pricing-loading">Checking current country prices…</div>:!visible.length?<div className="nx-pricing-loading">No available countries match this search right now.</div>:
   <div className="nx-pricing-grid">{visible.map((c:any)=>{const name=String(c.name||c.country||c.id||"Country");const price=Number(c.stock?.usdPrice||c.stock?.priceUsd||0);const count=Number(c.stock?.count||0);return <article className="nx-pricing-country" key={String(c.id||c.iso||name)}><div className="nx-pricing-country-top"><span className="nx-pricing-flag">{c.flag||"🌐"}</span><div><b>{name}</b><small>{c.iso||c.code||"Global"}</small></div></div><strong>{price>0?"$"+price.toFixed(2):"Unavailable"} <small>USD</small></strong><span className="nx-pricing-stock">{count.toLocaleString()} available</span></article>})}</div>}
  <p className="nx-pricing-disclaimer">Prices and availability are live estimates and may change before an order is placed. The final price is shown before confirmation.</p>
 </section>;
}
