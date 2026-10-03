"use client";
import Link from "next/link";
import {useEffect,useMemo,useState} from "react";
import TopBar from "@/components/TopBar";

type C={id?:string;code?:string;name?:string;country?:string;short_name?:string;flag?:string;stock?:{count:number;physicalCount:number;providerCost:number;sellCoins:number;usdPrice:number}|null};
const logo:Record<string,string>={wa:"whatsapp",tg:"telegram",go:"google",fb:"facebook",ig:"instagram",lf:"tiktok",tw:"x",sn:"snapchat",vi:"viber",ym:"yahoo",ds:"discord",am:"amazon"};
const groups={Africa:new Set(["south africa","ethiopia","kenya","somalia","nigeria","tanzania","uganda","ghana","rwanda","burundi","cameroon"]),Europe:new Set(["united kingdom","germany","france","netherlands","spain","italy","poland","portugal","sweden","norway"]),Asia:new Set(["china","india","japan","turkey","indonesia","malaysia","philippines"]),Popular:new Set(["united states","united kingdom","canada","germany","france","australia"])};

function AppLogo({service,name}:{service:string;name:string}){const slug=logo[service.toLowerCase()];return <span className={"service-icon service-icon-"+service.toLowerCase()}>{slug?<img src={"https://cdn.simpleicons.org/"+slug} alt="" loading="lazy"/>:name.slice(0,1).toUpperCase()}</span>}

export default function CountriesPage(){
 const[countries,setCountries]=useState<C[]>([]),[service,setService]=useState(""),[live,setLive]=useState(false),[loading,setLoading]=useState(true),[search,setSearch]=useState(""),[filter,setFilter]=useState("All");
 useEffect(()=>{const p=new URLSearchParams(window.location.search),sv=p.get("service")||"";setService(sv);fetch("/api/catalog/countries?service="+encodeURIComponent(sv),{cache:"no-store"}).then(r=>r.json()).then(d=>{setLive(!!d.live);setCountries(Array.isArray(d.countries)?d.countries:[])}).catch(()=>{setLive(false);setCountries([])}).finally(()=>setLoading(false))},[]);
 const visible=useMemo(()=>{const q=search.trim().toLowerCase();return [...countries].filter(c=>{const n=String(c.name||c.country||c.short_name||"").toLowerCase();if(q&&!n.includes(q))return false;if(filter!=="All"&&!groups[filter as keyof typeof groups]?.has(n))return false;return true}).sort((a,b)=>Number((b.stock?.count||0)>0)-Number((a.stock?.count||0)>0))},[countries,search,filter]);
 const serviceName=service==="wa"?"WhatsApp":service==="tg"?"Telegram":service||"Service";
 return <div className="countries-page">
  <TopBar title={serviceName} back/>
  <div className="country-banner"><AppLogo service={service} name={serviceName}/><div><b>Receive SMS for {serviceName}</b><small>Select a country to see available numbers and prices.</small></div></div>
  <div className="form-card country-search"><span className="search-icon">⌕</span><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search country…" autoComplete="off"/></div>
  <div id="country-filters" className="country-filters">{["All","Popular","Africa","Europe","Asia"].map(x=><button key={x} onClick={()=>setFilter(x)} className={filter===x?"active":""}>{x}</button>)}</div>
  <div className="list-card country-list">
   {loading&&<div className="country-loading">Loading countries…</div>}
   {!loading&&!visible.length&&<div className="country-loading">{live?"No countries match your search.":"Live availability is not connected yet."}</div>}
   {!loading&&visible.map((c,i)=>{const code=String(c.id||c.code||"");const name=c.name||c.country||c.short_name||code;const p=c.stock;const ready=!!p&&p.count>0&&p.sellCoins>0;const href="/get-code/new?service="+encodeURIComponent(service)+"&country="+encodeURIComponent(code)+"&countryName="+encodeURIComponent(name);return <Link className={"country-row "+(!ready?"country-unavailable":"")} key={code||i} href={ready?href:"#"} onClick={e=>{if(!ready)e.preventDefault()}}><span className="flag">{c.flag||"🌐"}</span><span className="country-name"><b>{name}</b><small>{p?p.count>0?"Available: "+p.count.toLocaleString():"Currently unavailable":"Checking availability…"}</small></span><span className="country-price">{ready?<><b>${p.usdPrice.toFixed(2)}</b><small>{p.sellCoins.toLocaleString()} coins</small></>:"—"}</span><span className="chevron">›</span></Link>})}
  </div>
  <div className="price-note"><span>i</span><p>Prices and stock update automatically. Coin pricing is controlled by Numelixa admin.</p></div>
 </div>;
}