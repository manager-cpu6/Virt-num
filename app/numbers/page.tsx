"use client";
import Link from "next/link";
import TopBar from "@/components/TopBar";
import {useCallback,useEffect,useMemo,useState} from "react";

type Order={
 id:string;
 status:string;
 phone_number?:string|null;
 service?:string|null;
 country?:string|null;
 code?:string|null;
 price_coins?:number;
 expires_at?:string|null;
 created_at?:string|null;
};

type Groups={active:Order[];received:Order[];cancelled:Order[]};

const iconFor=(status:string)=>{
 const s=status.toLowerCase();
 if(s==="received")return "✓";
 if(s==="cancelled"||s==="refunded")return "↻";
 return "⌛";
};
const labelFor=(status:string)=>{
 const s=status.toLowerCase();
 if(s==="received")return "Code received";
 if(s==="cancelled")return "Refunded";
 if(s==="refunded")return "Refunded";
 return "Waiting for SMS";
};

export default function Numbers(){
 const[o,setO]=useState<Order[]>([]);
 const[e,setE]=useState("");
 const[loaded,setLoaded]=useState(false);
 const[tab,setTab]=useState<keyof Groups>("active");
 const[refreshing,setRefreshing]=useState(false);

 const load=useCallback(async()=>{
  try{
   const r=await fetch("/api/my-orders",{cache:"no-store",credentials:"include"});
   const d=await r.json();
   if(d.ok){setO((d.orders||[]) as Order[]);setE("")}
   else setE(d.error||"Sign in required");
  }catch{setE("Unable to load your orders")}
  finally{setLoaded(true);setRefreshing(false)}
 },[]);

 useEffect(()=>{
  void load();
  const timer=window.setInterval(()=>void load(),15000);
  return()=>window.clearInterval(timer);
 },[load]);

 const groups=useMemo<Groups>(()=>({
  active:o.filter(x=>x.status==="waiting"),
  received:o.filter(x=>x.status==="received"),
  cancelled:o.filter(x=>["cancelled","refunded"].includes(x.status))
 }),[o]);
 const rows=groups[tab]||[];

 return <div className="orders-page">
  <TopBar title="Orders"/>
  <section className="orders-hero">
   <div>
    <span className="eyebrow">ORDER VAULT</span>
    <h1>Your orders</h1>
    <p>Live status, phone numbers and received SMS codes — all in one place.</p>
   </div>
   <button className={"orders-refresh"+(refreshing?" spinning":"")} onClick={()=>{setRefreshing(true);void load()}} aria-label="Refresh orders">↻</button>
  </section>

  {loaded&&e?
   <div className="auth-page">
    <div className="form-card">
     <div className="orders-empty-icon">☎</div>
     <h2>Sign in required</h2>
     <p>Sign in to see your purchased numbers and SMS codes.</p>
     <Link className="primary-btn full" href="/login">Sign in <span>→</span></Link>
     <Link className="secondary-btn full" href="/signup">Create account</Link>
    </div>
   </div>
  :
   <>
    <div className="orders-stat-strip">
     <div><span>ACTIVE</span><b>{groups.active.length}</b></div>
     <div><span>RECEIVED</span><b>{groups.received.length}</b></div>
     <div><span>ALL</span><b>{o.length}</b></div>
    </div>

    <div className="orders-tabs">
     <button className={tab==="active"?"selected":""} onClick={()=>setTab("active")}><span>⌛</span>Active<b>{groups.active.length}</b></button>
     <button className={tab==="received"?"selected":""} onClick={()=>setTab("received")}><span>✓</span>Received<b>{groups.received.length}</b></button>
     <button className={tab==="cancelled"?"selected":""} onClick={()=>setTab("cancelled")}><span>↻</span>Refunded<b>{groups.cancelled.length}</b></button>
    </div>

    <div className="orders-list">
     {rows.length?rows.map(x=>{
      const waiting=x.status==="waiting";
      const received=x.status==="received";
      return <article className={"order-card "+(received?"received":"")+(waiting?" waiting":"")} key={x.id}>
       <div className="order-card-top">
        <div className={"order-service-icon "+(received?"good":"")}>{iconFor(x.status)}</div>
        <div className="order-service-copy">
         <strong>{x.service||"SMS service"}</strong>
         <small>{x.country||"Unknown country"}{x.phone_number?" · "+x.phone_number:""}</small>
        </div>
        <span className={"order-status "+(received?"good":"")}>{labelFor(x.status)}</span>
       </div>

       <div className="order-number-box">
        <span>{x.phone_number||"Waiting for number…"}</span>
        {x.phone_number&&<span className="copy-hint">NUMBER</span>}
       </div>

       {x.code&&<div className="order-code-box"><span>OTP CODE</span><strong>{x.code}</strong><b>✓ SMS RECEIVED</b></div>}

       <div className="order-card-footer">
        <span>{x.price_coins?Number(x.price_coins).toLocaleString()+" coins":"Order"}{x.expires_at?" · Expires "+new Date(x.expires_at).toLocaleTimeString([], {hour:"2-digit",minute:"2-digit"}):""}</span>
        {waiting?<Link href={"/get-code/"+x.id}>Get code <b>→</b></Link>:<span className="order-complete">Completed</span>}
       </div>
      </article>
     }):<div className="orders-empty">
      <div className="orders-empty-icon">{tab==="active"?"⌛":tab==="received"?"✓":"↻"}</div>
      <h3>No {tab==="cancelled"?"refunded":tab} orders</h3>
      <p>Your {tab==="active"?"active orders":tab==="received"?"received SMS codes":"refunded orders"} will appear here.</p>
      {tab==="active"&&<Link className="primary-btn" href="/services">Get a number <span>→</span></Link>}
     </div>}
    </div>
   </>
  }
 </div>;
}
