"use client";
import {useEffect,useState} from "react";

type ApiKey={_id:string;name:string;prefix:string;active:boolean;createdAt:string;lastUsedAt:string|null;revokedAt:string|null};

const base="https://numelixa.com/api/v1";

export default function Developers(){
 const[keys,setKeys]=useState<ApiKey[]>([]);
 const[loading,setLoading]=useState(true);
 const[busy,setBusy]=useState(false);
 const[notice,setNotice]=useState("");
 const[noticeType,setNoticeType]=useState<"info"|"error"|"success">("info");

 async function load(){
  setLoading(true);
  setNotice("");
  try{
   const r=await fetch("/api/developer/keys",{cache:"no-store"});
   const j=await r.json().catch(()=>({}));
   if(!r.ok){
    setKeys([]);
    setNotice(j.error||"Unable to load your API key. Please sign in again.");
    setNoticeType("error");
    return;
   }
   setKeys(Array.isArray(j.keys)?j.keys:[]);
  }catch{
   setKeys([]);
   setNotice("Unable to load your API key. Please refresh the page.");
   setNoticeType("error");
  }finally{
   setLoading(false);
  }
 }
 useEffect(()=>{load()},[]);

 const active=keys.find(k=>k.active);

 async function copyKey(){
  setBusy(true);
  setNotice("");
  try{
   const r=await fetch("/api/developer/keys?reveal=1",{cache:"no-store"});
   const j=await r.json().catch(()=>({}));
   if(!r.ok||!j.key){
    setNotice(j.error||"Unable to copy API key.");
    setNoticeType("error");
    return;
   }
   await navigator.clipboard.writeText(j.key);
   setNotice("API key copied to clipboard.");
   setNoticeType("success");
  }catch{
   setNotice("Copy failed. Please try again.");
   setNoticeType("error");
  }finally{
   setBusy(false);
  }
 }

 async function revoke(){
  if(!active?._id)return;
  if(!window.confirm("Revoke this API key and immediately create a new production key?"))return;
  setBusy(true);
  setNotice("");
  try{
   const r=await fetch("/api/developer/keys?id="+encodeURIComponent(active._id),{method:"DELETE"});
   const j=await r.json().catch(()=>({}));
   if(!r.ok){
    setNotice(j.error||"Unable to revoke API key.");
    setNoticeType("error");
    return;
   }
   setKeys(Array.isArray(j.keys)?j.keys:[]);
   setNotice("Old API key revoked. A new production key is now active.");
   setNoticeType("success");
  }catch{
   setNotice("Unable to revoke API key. Please try again.");
   setNoticeType("error");
  }finally{
   setBusy(false);
  }
 }

 return <main className="developer-shell" style={{color:"#eafff9"}}>
  <div className="developer-hero" style={{marginBottom:18}}>
   <div style={{fontSize:11,letterSpacing:3,color:"#72dfce",fontWeight:900}}>NUMELIXA DEVELOPERS</div>
   <h1 style={{fontSize:42,letterSpacing:-2.2,margin:"8px 0"}}>Developer API</h1>
   <p style={{color:"#83a5a6",maxWidth:800}}>Build your own app, bot or automation on top of Numelixa. Use your account balance to check live inventory, read current prices, buy numbers and retrieve SMS codes.</p>
  </div>

  <section style={{marginBottom:16,padding:22,borderRadius:24,border:"1px solid rgba(121,246,229,.2)",background:"linear-gradient(145deg,rgba(8,53,61,.96),rgba(4,30,37,.94))",boxShadow:"0 18px 50px rgba(0,0,0,.18)"}}>
   <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:14,flexWrap:"wrap"}}>
    <div>
     <div style={{fontSize:11,letterSpacing:2,color:"#72dfce",fontWeight:900}}>PRODUCTION API KEY</div>
     <h2 style={{margin:"6px 0 3px",fontSize:24}}>Your API access</h2>
     <div style={{fontSize:12,color:"#78999a"}}>Keep the secret hidden. Copy it directly when you need to connect your app.</div>
    </div>
    <span style={{padding:"7px 11px",borderRadius:999,background:active?"rgba(80,220,150,.1)":"rgba(255,190,80,.1)",color:active?"#79e5ae":"#ffd27a",fontSize:11,fontWeight:900}}>
     {loading?"LOADING":active?"ACTIVE":"NEEDS SIGN IN"}
    </span>
   </div>

   <div style={{marginTop:16,padding:16,borderRadius:16,background:"rgba(0,0,0,.20)",border:"1px solid rgba(121,246,229,.10)"}}>
    <div style={{fontSize:11,color:"#75999a",fontWeight:900,letterSpacing:1}}>SECRET</div>
    <code className="developer-key-value" style={{display:"block",marginTop:8,padding:14,borderRadius:13,background:"rgba(0,0,0,.30)",fontSize:14}}>
     {active?.prefix||"nx_live_"}••••••••••••••••••••
    </code>

    <div className="developer-key-actions" style={{display:"flex",gap:10,marginTop:12}}>
     <button type="button" className="developer-key-copy" onClick={copyKey} disabled={loading||!active||busy}>
      {busy?"Working…":"Copy API key"}
     </button>
     <button type="button" className="developer-revoke" onClick={revoke} disabled={loading||!active||busy}>
      Revoke & Replace
     </button>
     
    </div>

    <div style={{marginTop:10,fontSize:11,color:"#6f9192"}}>
     Copy puts the full secret directly into your clipboard. The full secret is never displayed on this page.
    </div>
   </div>

   {notice&&<div style={{marginTop:12,padding:11,borderRadius:11,background:noticeType==="error"?"rgba(255,90,90,.08)":"rgba(114,223,206,.06)",color:noticeType==="error"?"#ffaaa8":"#91d8cf",fontSize:12}}>{notice}</div>}
  </section>

  <section className="developer-main-grid" style={{marginBottom:16}}>
   <div style={{padding:22,borderRadius:24,border:"1px solid rgba(121,246,229,.14)",background:"rgba(5,39,47,.78)"}}>
    <div style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"center",flexWrap:"wrap"}}>
     <div><h2 style={{margin:"0 0 5px"}}>API access</h2><p style={{margin:0,fontSize:12,color:"#75999a"}}>Your production key is managed automatically for this account.</p></div>
     <span style={{padding:"6px 10px",borderRadius:999,background:active?"rgba(80,220,150,.1)":"rgba(255,190,80,.1)",color:active?"#79e5ae":"#ffd27a",fontSize:11,fontWeight:900}}>{active?"ACTIVE":"NOT CONNECTED"}</span>
    </div>
    <div style={{marginTop:18,padding:16,borderRadius:16,background:"rgba(114,223,206,.05)",border:"1px solid rgba(114,223,206,.12)"}}>
     <div style={{fontSize:11,color:"#72dfce",fontWeight:900,letterSpacing:1}}>AUTHENTICATION</div>
     <pre style={{overflowX:"auto",margin:"8px 0 0",padding:13,borderRadius:12,background:"#021b21",fontSize:12}}>Authorization: Bearer NX_API_KEY</pre>
     <p style={{margin:"10px 0 0",fontSize:11,color:"#6f9192"}}>Use your production API key in the Authorization header. Provider credentials are never exposed.</p>
    </div>
   </div>

   <div style={{padding:22,borderRadius:24,border:"1px solid rgba(121,246,229,.14)",background:"rgba(5,39,47,.78)"}}>
    <div style={{fontSize:11,color:"#72dfce",fontWeight:900,letterSpacing:1}}>API PLATFORM</div>
    <h2 style={{margin:"7px 0"}}>Ready to integrate</h2>
    <p style={{color:"#7e9e9f",fontSize:13}}>Base URL</p>
    <code style={{display:"block",padding:11,borderRadius:10,background:"#021b21",fontSize:11,wordBreak:"break-all"}}>{base}</code>
    <a href="/developers/docs" style={{display:"inline-block",marginTop:15,padding:"11px 14px",borderRadius:11,background:"#72dfce",color:"#03242b",fontWeight:900,textDecoration:"none"}}>Open complete API Docs →</a>
    <p style={{color:"#6f9192",fontSize:11,lineHeight:1.6}}>Revoke & Replace invalidates the old secret immediately and creates a new production key.</p>
   </div>
  </section>

  <section style={{padding:22,borderRadius:24,border:"1px solid rgba(121,246,229,.14)",background:"rgba(5,39,47,.78)",marginBottom:16}}>
   <h2 style={{marginTop:0}}>Key history</h2>
   {loading?"Loading…":keys.length?keys.map(k=>
    <div key={k._id} className="developer-history-row">
     <div><b>{k.name}</b><div style={{marginTop:5,fontSize:11,color:"#78999a",fontFamily:"monospace"}}>{k.prefix}••••••••••••</div><div style={{marginTop:4,fontSize:11,color:k.active?"#79e5ae":"#9b8585"}}>{k.active?"Active":"Revoked"} · Created {new Date(k.createdAt).toLocaleString()}{k.revokedAt?" · Revoked "+new Date(k.revokedAt).toLocaleString():""}</div></div>
     {k.active&&<button className="developer-revoke" onClick={revoke} disabled={busy}>Revoke & Replace</button>}
    </div>
   ):<div style={{padding:"18px 0",fontSize:12,color:"#78999a"}}>No API key record is available for this account yet. Refresh after signing in.</div>}
  </section>

  <section style={{padding:22,borderRadius:24,border:"1px solid rgba(121,246,229,.14)",background:"rgba(5,39,47,.78)"}}>
   <h2 style={{marginTop:0}}>Build with Numelixa</h2>
   <p style={{color:"#7e9e9f"}}>The complete documentation includes copy-ready cURL, JavaScript, Python and PHP examples for balance, services, countries, live stock, purchasing, SMS polling, cancellation, refunds, transactions and errors.</p>
   <a href="/developers/docs" style={{color:"#72dfce",fontWeight:900}}>View complete reference →</a>
  </section>
 </main>
}
