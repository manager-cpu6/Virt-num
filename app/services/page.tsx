"use client";
import {useEffect,useMemo,useState} from "react";
import Link from "next/link";
import TopBar from "@/components/TopBar";

type S={id?:string;code?:string;service?:string;name?:string;short_name?:string;icon?:string};
const icons:Record<string,string>={wa:"◉",tg:"✈",go:"G",fb:"f",ig:"◎",lf:"♪",sn:"◆",tw:"𝕏",vi:"V",ds:"◌",am:"a",ms:"⊞",apple:"●",sg:"S",wb:"W",ym:"Y",ot:"＋"};

export default function ServicesPage(){
  const[s,setS]=useState<S[]>([]),[q,setQ]=useState(""),[loading,setLoading]=useState(true);
  useEffect(()=>{fetch("/api/catalog/services",{cache:"no-store"}).then(async r=>{const d=await r.json();setS(Array.isArray(d.services)?d.services:[])}).catch(()=>setS([])).finally(()=>setLoading(false))},[]);
  const filtered=useMemo(()=>s.filter(x=>String(x.name||x.service||x.code||x.id||"").toLowerCase().includes(q.toLowerCase())),[s,q]);
  return <div className="services-page">
    <TopBar title="Services" back/>
    <div className="page-intro service-intro"><span className="eyebrow">GLOBAL SMS SERVICES</span><h1>Choose a service</h1><p>{loading?"Loading services…":s.length?s.length+"+ services available. Choose a service to view countries and live pricing.":"Choose a service to continue."}</p></div>
    <div className="form-card service-search"><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search service…" autoComplete="off"/></div>
    {!loading&&<div className="section-head service-section-head"><div><span className="eyebrow">POPULAR</span><h2>Popular services</h2></div><span className="service-count">{filtered.length} shown</span></div>}
    <div className="service-grid">{filtered.map((x,i)=>{const name=x.name||x.service||x.code||"Service";const id=String(x.code||x.id||name);const icon=x.icon||icons[id.toLowerCase()]||name.charAt(0).toUpperCase();return <Link key={id+i} className="service-card" href={"/countries?service="+encodeURIComponent(id)}><span className="service-icon">{icon}</span><div><b>{name}</b><small>Countries & pricing</small></div><span className="chevron">›</span></Link>})}</div>
    {!loading&&!filtered.length&&<div className="helper-card"><b>No matching service</b><span>Try another search.</span></div>}
  </div>;
}
