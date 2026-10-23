"use client";
import {useEffect,useState} from "react";
export default function LocalPaymentsAdmin(){
 const [state,setState]=useState<any>(null),[busy,setBusy]=useState(false),[error,setError]=useState(""),[saved,setSaved]=useState("");
 async function load(){setError("");try{const r=await fetch("/api/admin/sifalo",{cache:"no-store"}),d=await r.json();if(!r.ok||!d.ok)throw new Error(d.error||"Unable to load settings");setState(d)}catch(e){setError(e instanceof Error?e.message:"Unable to load settings")}}
 useEffect(()=>{void load()},[]);
 async function change(open:boolean){setBusy(true);setError("");setSaved("");try{const r=await fetch("/api/admin/sifalo",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({open})}),d=await r.json();if(!r.ok||!d.ok)throw new Error(d.error||"Unable to save setting");setState((s:any)=>({...s,open:d.open}));setSaved(open?"Local Payments are now OPEN.":"Local Payments are now CLOSED.");}catch(e){setError(e instanceof Error?e.message:"Unable to save setting")}finally{setBusy(false)}}
 return <main style={{minHeight:"100vh",background:"#030817",color:"#F5F8FF",padding:"clamp(18px,4vw,42px)",fontFamily:"system-ui,sans-serif"}}>
  <div style={{maxWidth:860,margin:"0 auto"}}>
   <a href="/admin" style={{color:"#00D9FF",textDecoration:"none"}}>← Admin Panel</a>
   <p style={{color:"#00D9FF",fontWeight:800,letterSpacing:2,fontSize:12,marginTop:28}}>PAYMENT CONTROLS</p>
   <h1 style={{fontSize:"clamp(28px,5vw,42px)",margin:"8px 0"}}>Local Payments</h1>
   <p style={{color:"#A7B7D0",lineHeight:1.6}}>Control whether customers can choose Local Payment alongside Crypto Payment.</p>
   {error&&<div role="alert" style={{marginTop:20,padding:14,border:"1px solid #783D53",borderRadius:14,color:"#FF9DAF"}}>{error}</div>}
   {saved&&<div role="status" style={{marginTop:20,padding:14,border:"1px solid #176B5B",borderRadius:14,color:"#72E8C8"}}>{saved}</div>}
   {!state?<div style={{marginTop:24,color:"#A7B7D0"}}>Loading secure settings…</div>:<section style={{marginTop:24,background:"#071329",border:"1px solid #173253",borderRadius:24,padding:"clamp(18px,4vw,30px)"}}>
    <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:16,flexWrap:"wrap"}}>
     <div><div style={{fontSize:12,color:"#A7B7D0",letterSpacing:1.5}}>CURRENT STATUS</div><div style={{fontSize:28,fontWeight:850,marginTop:8,color:state.open?"#00E5C3":"#A7B7D0"}}>{state.open?"OPEN":"CLOSED"}</div><div style={{color:"#A7B7D0",marginTop:5}}>{state.open?"Customers can choose Crypto or Local Payment.":"Customers only see cryptocurrency payment."}</div></div>
     <div aria-label={state.open?"Local payments open":"Local payments closed"} style={{width:66,height:66,borderRadius:20,display:"grid",placeItems:"center",background:state.open?"rgba(0,229,195,.12)":"rgba(113,133,165,.12)",fontSize:30}}>{state.open?"✓":"Ⅱ"}</div>
    </div>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(145px,1fr))",gap:10,marginTop:24}}>
     {["Waafi · EVC · ZAAD · SAHAL","eDahab","Premier Wallet"].map(method=><div key={method} style={{border:"1px solid #1A3658",borderRadius:14,padding:14,background:"#081B36"}}><div style={{color:"#00D9FF",fontSize:11,letterSpacing:1}}>LOCAL WALLET</div><strong style={{display:"block",marginTop:7}}>{method}</strong></div>)}
    </div>
    <div style={{marginTop:12,padding:14,background:"#081B36",borderRadius:14,color:"#A7B7D0",fontSize:12,lineHeight:1.6}}>Card payments are not currently available. Keep card options disabled until a card processor is configured.</div>
    <div style={{marginTop:20,padding:14,background:"#081B36",borderRadius:14,color:"#A7B7D0",fontSize:13,lineHeight:1.6}}>API configuration: <strong style={{color:state.configured?"#00E5C3":"#FF9DAF"}}>{state.configured?"Configured":"Missing"}</strong>. {state.configured?"Credentials are read only by the server.":"Payment gateway credentials must be configured securely on the server before opening Local Payments."}</div>
    <div style={{display:"flex",gap:12,flexWrap:"wrap",marginTop:22}}>
     <button disabled={busy||!state.configured||state.open} onClick={()=>change(true)} style={{border:0,borderRadius:14,padding:"14px 20px",fontWeight:800,color:"#03111C",background:"#00E5C3",opacity:busy||!state.configured||state.open ? .55 : 1,cursor:"pointer"}}>{busy?"Saving…":"Open Local Payments"}</button>
     <button disabled={busy||!state.open} onClick={()=>change(false)} style={{border:"1px solid #37506F",borderRadius:14,padding:"14px 20px",fontWeight:800,color:"#F5F8FF",background:"#0D2345",opacity:busy||!state.open ? .55 : 1,cursor:"pointer"}}>{busy?"Saving…":"Close Local Payments"}</button>
    </div>
   </section>}
  </div>
 </main>
}
