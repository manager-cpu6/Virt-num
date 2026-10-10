"use client";
import {useEffect,useMemo,useState} from "react";
import Link from "next/link";
import TopBar from "@/components/TopBar";

type S={id:string;code:string;name:string};

const popular=["whatsapp","facebook","instagram","telegram","tiktok","google","snapchat","twitter","discord","amazon","microsoft","apple","openai","viber","signal"];
const popularAliases:Record<string,string[]>={
 whatsapp:["whatsapp","wa"],telegram:["telegram","tg"],google:["google","go"],facebook:["facebook","fb"],instagram:["instagram","ig","threads"],tiktok:["tiktok","tt"],twitter:["twitter","x","tw"],snapchat:["snapchat","sn"],viber:["viber"],discord:["discord"],amazon:["amazon"],microsoft:["microsoft","ms"],apple:["apple"],openai:["openai","chatgpt","op"],signal:["signal"]
};
function popularRank(x:S){
 const normalize=(v:string)=>String(v||"").toLowerCase().replace(/[^a-z0-9]/g,"");
 const id=normalize(x.id),name=normalize(x.name),raw=id+" "+name;
 for(let i=0;i<popular.length;i++){
  const aliases=popularAliases[popular[i]]||[popular[i]];
  if(aliases.some(alias=>{
   const a=normalize(alias);
   return id===a||name===a||(a.length>2&&(id.startsWith(a)||name.startsWith(a)));
  }))return i;
 }
 return 9999;
}

function AppLogo({id,name}:{id:string;name:string}){
 const[hasLogo,setHasLogo]=useState(true);
 return <span className={"service-icon service-icon-"+id}>
   {hasLogo
     ? <img src={"https://cdn.simpleicons.org/"+id} alt="" loading="lazy" onLoad={()=>setHasLogo(true)} onError={()=>setHasLogo(false)}/>
     : <span className="service-letter">{name.slice(0,1).toUpperCase()}</span>}
 </span>
}

export default function ServicesPage(){
 const[s,setS]=useState<S[]>([]),[q,setQ]=useState(""),[loading,setLoading]=useState(true),[showAll,setShowAll]=useState(false),[error,setError]=useState("");
 useEffect(()=>{
   fetch("/api/catalog/services",{cache:"no-store"})
     .then(async r=>{const d=await r.json();if(!r.ok||!d.ok)throw new Error(d.error||"Live catalog unavailable");setS(Array.isArray(d.services)?d.services:[])})
     .catch(e=>setError(e instanceof Error?e.message:"Unable to load live services"))
     .finally(()=>setLoading(false))
 },[]);
 const filtered=useMemo(()=>{
   const query=q.trim().toLowerCase();
   if(query)return s.filter(x=>(x.name+" "+x.id).toLowerCase().includes(query));
   const ranked=[...s].sort((a,b)=>popularRank(a)-popularRank(b)||a.name.localeCompare(b.name));
   if(showAll)return ranked;
   const p=ranked.filter(x=>popularRank(x)<9999);
   return p.length?p.slice(0,16):ranked.slice(0,16)
 },[s,q,showAll]);

 return <div className="services-page">
   <TopBar/>
   <section className="market-hero">
     <div className="market-hero-copy">
       <span className="eyebrow">NUMELIXA • LIVE SMS CATALOG</span>
       <h1>Virtual Numbers<br/>from <em>153 Countries</em></h1>
       <p>Choose a service and then select any supported country with live price and stock.</p>
       <div className="market-stats">
         <span>◉ <b>153</b> Countries</span>
         <span>▱ <b>{s.length||"1,300+"}</b> Services</span>
         <span>ϟ <b>Ready</b> Now</span>
       </div>
     </div>
     <div className="market-globe" aria-hidden="true">🌍</div>
   </section>

   <div className="service-search-box">
     <span className="search-icon" aria-hidden="true">⌕</span>
     <input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search 1,300+ services…" autoComplete="off" aria-label="Search services"/>
     {q&&<button type="button" className="search-clear" onClick={()=>setQ("")} aria-label="Clear search">×</button>}
   </div>

   <div className="section-head service-section-head">
     <div><h2>{q?"Search results":"Popular Services"}</h2>{q&&<span className="service-count">{filtered.length.toLocaleString()} matching services</span>}</div>
     {!q&&s.length>16&&<button className="view-all-btn" onClick={()=>setShowAll(v=>!v)}>{showAll?"Show popular":"View all ("+s.length+")"} <span>→</span></button>}
   </div>

   {loading?<div className="service-loading">Loading live services…</div>
   :error?<div className="helper-card"><b>Live catalog unavailable</b><span>Please try again in a moment.</span></div>
   :<div className="service-grid">{filtered.map((x,i)=><Link key={x.id+i} className="service-card" href={"/countries?service="+encodeURIComponent(x.id)}><AppLogo id={x.id} name={x.name}/><div><b>{x.name}</b><small>Live SMS verification</small></div><span className="chevron">›</span></Link>)}</div>}

   {!loading&&!error&&!filtered.length&&<div className="helper-card"><b>No matching service</b><span>Try another search.</span></div>}
 </div>
}
