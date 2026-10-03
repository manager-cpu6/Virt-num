"use client";
import Link from "next/link";
import {useEffect,useMemo,useState} from "react";
import TopBar from "@/components/TopBar";

type C={id?:string;code?:string;name?:string;country?:string;short_name?:string;flag?:string};
type P={count:number;sellCoins:number;providerCost:number};
const flag=(name:string)=>{const a:Record<string,string>={"united states":"US","united kingdom":"GB","canada":"CA","germany":"DE","france":"FR","netherlands":"NL","spain":"ES","australia":"AU","ethiopia":"ET","kenya":"KE","somalia":"SO","nigeria":"NG","south africa":"ZA","tanzania":"TZ","uganda":"UG","ghana":"GH","rwanda":"RW","burundi":"BI","cameroon":"CM","china":"CN","turkey":"TR"};const code=a[name.toLowerCase().trim()]||"";return code?String.fromCodePoint(...[...code].map(c=>127397+c.charCodeAt(0))):"🌐"};
const fallbackCountries:C[]=[["US","United States"],["GB","United Kingdom"],["CA","Canada"],["DE","Germany"],["FR","France"],["NL","Netherlands"],["ES","Spain"],["AU","Australia"],["ZA","South Africa"],["ET","Ethiopia"],["KE","Kenya"],["NG","Nigeria"]].map(([code,name])=>({id:code,code,name,short_name:name,flag:flag(name)}));

export default function CountriesPage(){
  const[countries,setCountries]=useState<C[]>([]),[service,setService]=useState(""),[prices,setPrices]=useState<Record<string,P|undefined>>({}),[loading,setLoading]=useState(true),[search,setSearch]=useState("");
  useEffect(()=>{const p=new URLSearchParams(location.search);setService(p.get("service")||"");fetch("/api/catalog/countries",{cache:"no-store"}).then(r=>r.json()).then(d=>setCountries(Array.isArray(d.countries)&&d.countries.length?d.countries:fallbackCountries)).catch(()=>setCountries(fallbackCountries)).finally(()=>setLoading(false))},[]);
  useEffect(()=>{if(!service||!countries.length)return;let cancelled=false;const run=async()=>{const out:Record<string,P|undefined>={};for(let i=0;i<countries.length;i+=8){const batch=countries.slice(i,i+8);await Promise.all(batch.map(async c=>{const code=String(c.id||c.code||"");if(!code)return;try{const r=await fetch("/api/catalog/stock?country="+encodeURIComponent(code)+"&service="+encodeURIComponent(service),{cache:"no-store"});const d=await r.json();out[code]=d.ok?{count:Number(d.stock?.count||0),sellCoins:Number(d.stock?.sellCoins||0),providerCost:Number(d.stock?.providerCost||0)}:undefined}catch{out[code]=undefined}}));if(!cancelled)setPrices({...out})}};run();return()=>{cancelled=true}},[service,countries]);
  const visible=useMemo(()=>{const q=search.trim().toLowerCase();return countries.filter(c=>String(c.name||c.country||c.short_name||c.code||c.id||"").toLowerCase().includes(q))},[countries,search]);
  return <div className="countries-page">
    <TopBar title="Choose country" back/>
    <div className="country-service-head"><div className="service-badge">{service==="wa"?"◉":service==="tg"?"✈":service.charAt(0).toUpperCase()||"•"}</div><div><span className="eyebrow">SELECT COUNTRY</span><h1>{service||"Service"}</h1><p>Choose a country to see current availability and price.</p></div></div>
    <div className="form-card country-search"><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search country…" autoComplete="off"/></div>
    <div className="country-filters">{["All","Popular","Africa","Europe","Asia"].map((x,i)=><button key={x} className={i===0?"active":""}>{x}</button>)}</div>
    <div className="list-card country-list">{loading&&<div className="country-loading">Loading countries…</div>}{!loading&&visible.map((c,i)=>{const code=String(c.id||c.code||"");const name=c.name||c.country||c.short_name||code;const p=prices[code];const ready=!!p&&p.count>0&&p.sellCoins>0;const href="/get-code/new?service="+encodeURIComponent(service)+"&country="+encodeURIComponent(code)+"&countryName="+encodeURIComponent(name);return <Link className={"country-row "+(!ready?"country-unavailable":"")} key={code||i} href={ready?href:"#"} onClick={e=>{if(!ready)e.preventDefault()}}><span className="flag">{c.flag||flag(name)}</span><span className="country-name"><b>{name}</b><small>{p===undefined?"Availability updating…":p.count>0?p.count.toLocaleString()+" available":"Currently unavailable"}</small></span><span className="country-price">{ready?p.sellCoins.toLocaleString()+" coins":"—"}</span><span className="chevron">›</span></Link>})}</div>
    {!loading&&!visible.length&&<div className="helper-card"><b>No country found</b><span>Try another search.</span></div>}
  </div>;
}
