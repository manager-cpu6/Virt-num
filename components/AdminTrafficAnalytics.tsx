"use client";
import {useCallback,useEffect,useState} from "react";

type Source={source:string;pageViews:number;clicks:number;uniqueVisitors:number;lastActivity:string|null};
type Place={country:string;countryCode:string;city?:string;uniqueVisitors:number;visits:number;lastSeen:string|null};
type Data={pageViews:number;clicks:number;uniqueVisitors:number;periodDays:number;sources:Source[];pages:{path:string;views:number}[];countries:Place[];cities:Place[]};
export default function AdminTrafficAnalytics(){
 const[data,setData]=useState<Data|null>(null),[error,setError]=useState(""),[busy,setBusy]=useState(false);
 const load=useCallback(async()=>{
  setBusy(true);setError("");
  try{const response=await fetch("/api/admin/traffic",{cache:"no-store"});const result=await response.json();if(!response.ok||!result.ok)throw new Error(result.error||"Unable to load traffic data");setData(result);}
  catch(e){setError(e instanceof Error?e.message:"Unable to load traffic data");}
  finally{setBusy(false);}
 },[]);
 useEffect(()=>{void load();const id=window.setInterval(()=>void load(),60000);return()=>window.clearInterval(id)},[load]);
 const metric=(label:string,value:number|undefined)=><div className="metric" key={label}><span>{label}</span><strong>{Number(value||0).toLocaleString()}</strong><small>last 30 days</small></div>;
 return <div className="admin-traffic-stack">
  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,flexWrap:"wrap"}}>
   <div><h2 style={{margin:"0 0 5px"}}>Website traffic sources</h2><p className="admin-help" style={{margin:0}}>See which websites bring visitors to Numelixa and which sources generate clicks.</p></div>
   <button className="secondary-btn" onClick={()=>void load()} disabled={busy}>{busy?"Refreshing…":"↻ Refresh"}</button>
  </div>
  {error&&<div className="error-box">{error}</div>}
  <div className="admin-grid admin-grid-wide">{metric("Page views",data?.pageViews)}{metric("Button clicks",data?.clicks)}{metric("Unique visitors",data?.uniqueVisitors)}</div>
  <div className="admin-card">
   <h2>Global View · Visitors by country</h2>
   <p className="admin-help">Each visitor is counted once per country in the selected 30-day period, even if they open many pages. Country and city are inferred from hosting-network location headers; unavailable locations are shown as Unknown.</p>
   {!data?.countries?.length?<div className="country-loading">No country data yet. New page visits will appear after this tracking update is deployed.</div>:<div className="admin-stat-list">
    <div className="admin-row" style={{fontWeight:800,opacity:.72}}><span>Country</span><span style={{display:"flex",gap:24}}><small>Unique users</small><small>Views</small></span></div>
    {data.countries.map(item=><div className="admin-row" key={item.countryCode+"-"+item.country}><span><b>{item.country}</b><small>{item.countryCode||"Location unavailable"}</small></span><strong style={{display:"flex",gap:24,fontVariantNumeric:"tabular-nums"}}><span>{item.uniqueVisitors.toLocaleString()}</span><span>{item.visits.toLocaleString()}</span></strong></div>)}
   </div>}
  </div>
  <div className="admin-card">
   <h2>Most visited cities</h2>
   {!data?.cities?.length?<div className="country-loading">No city data yet. City names depend on the visitor location data supplied by the hosting network.</div>:<div className="admin-stat-list">
    <div className="admin-row" style={{fontWeight:800,opacity:.72}}><span>City / country</span><span style={{display:"flex",gap:24}}><small>Unique users</small><small>Views</small></span></div>
    {data.cities.map(item=><div className="admin-row" key={item.countryCode+"-"+item.city+"-"+item.country}><span><b>{item.city||"Unknown"}</b><small>{item.country}</small></span><strong style={{display:"flex",gap:24,fontVariantNumeric:"tabular-nums"}}><span>{item.uniqueVisitors.toLocaleString()}</span><span>{item.visits.toLocaleString()}</span></strong></div>)}
   </div>}
  </div>
  <div className="admin-card">
   <h2>Top traffic sources</h2>
   <p className="admin-help">Examples include chatgpt.com, gemini.google.com, Google, social networks, referral websites and Direct. Clicks are tracked separately from page views.</p>
   {!data?.sources?.length?<div className="country-loading">No source data has been collected yet. New visits will appear here.</div>:<div className="admin-stat-list">
    <div className="admin-row" style={{fontWeight:800,opacity:.72}}><span>Source website</span><span style={{display:"flex",gap:24}}><small>Views</small><small>Clicks</small><small>Visitors</small></span></div>
    {data.sources.map(item=><div className="admin-row" key={item.source}><span><b>{item.source==="direct"?"Direct / no referrer":item.source}</b><small>{item.lastActivity?"Last activity: "+new Date(item.lastActivity).toLocaleString():""}</small></span><strong style={{display:"flex",gap:24,fontVariantNumeric:"tabular-nums"}}><span>{item.pageViews.toLocaleString()}</span><span>{item.clicks.toLocaleString()}</span><span>{item.uniqueVisitors.toLocaleString()}</span></strong></div>)}
   </div>}
  </div>
  <div className="admin-card">
   <h2>Most visited pages</h2>
   {!data?.pages?.length?<div className="country-loading">No page-view data yet.</div>:<div className="admin-stat-list">{data.pages.map(page=><div className="admin-row" key={page.path}><span><b>{page.path}</b></span><strong>{page.views.toLocaleString()}</strong></div>)}</div>}
  </div>
  <p className="admin-help">Traffic reporting is anonymous and begins from this tracking release; it does not reconstruct visits from before tracking was enabled. A visitor is deduplicated by the anonymous browser visitor ID within each country or city. Source attribution uses the first referrer or UTM source seen in each browser session.</p>
 </div>;
}
