"use client";
import Link from "next/link";
import TopBar from "@/components/TopBar";
import {useCallback,useEffect,useMemo,useState} from "react";

type Order={
 id:string;status:string;phone_number?:string|null;service?:string|null;country?:string|null;
 country_code?:string|null;code?:string|null;price_usd?:number;expires_at?:string|null;created_at?:string|null;
};
type Tab="all"|"active"|"received"|"cancelled"|"failed";
const tabs:{id:Tab;label:string}[]=[
 {id:"all",label:"All orders"},{id:"active",label:"Active"},{id:"received",label:"Received"},
 {id:"cancelled",label:"Cancelled"},{id:"failed",label:"Failed"}
];
function statusLabel(status:string){
 switch(status.toLowerCase()){
  case "waiting":return "Waiting for SMS";
  case "cancelling":return "Cancellation processing";
  case "received":return "Code received";
  case "cancelled":return "Cancelled";
  case "refunded":return "Refunded";
  case "failed":return "Failed";
  default:return status.replace(/[_-]+/g," ").replace(/\b\w/g,c=>c.toUpperCase())||"Order status";
 }
}
function remaining(expiresAt?:string|null){
 if(!expiresAt)return "";
 const ms=new Date(expiresAt).getTime()-Date.now();
 if(!Number.isFinite(ms))return "";
 if(ms<=0)return "Expiry reached · checking status";
 const seconds=Math.floor(ms/1000),minutes=Math.floor(seconds/60),rest=seconds%60;
 return minutes>0?minutes+"m "+rest+"s remaining":rest+"s remaining";
}
export default function Numbers(){
 const[orders,setOrders]=useState<Order[]>([]);
 const[error,setError]=useState("");
 const[loaded,setLoaded]=useState(false);
 const[tab,setTab]=useState<Tab>("all");
 const[query,setQuery]=useState("");
 const[refreshing,setRefreshing]=useState(false);
 const[copyNotice,setCopyNotice]=useState("");

 const load=useCallback(async()=>{
  try{
   const response=await fetch("/api/my-orders",{cache:"no-store",credentials:"include"});
   const data=await response.json();
   if(!response.ok||!data.ok)throw new Error(data.error||"Sign in required");
   setOrders(Array.isArray(data.orders)?data.orders:[]);
   setError("");
  }catch(reason){setError(reason instanceof Error?reason.message:"Unable to load your orders");}
  finally{setLoaded(true);setRefreshing(false);}
 },[]);
 useEffect(()=>{void load();const timer=window.setInterval(()=>void load(),15000);return()=>window.clearInterval(timer)},[load]);

 const groups=useMemo(()=>({
  all:orders,
  active:orders.filter(item=>["waiting","cancelling"].includes(item.status.toLowerCase())),
  received:orders.filter(item=>item.status.toLowerCase()==="received"),
  cancelled:orders.filter(item=>["cancelled","refunded"].includes(item.status.toLowerCase())),
  failed:orders.filter(item=>item.status.toLowerCase()==="failed")
 }),[orders]);
 const visible=useMemo(()=>{
  const q=query.trim().toLowerCase();
  return groups[tab].filter(item=>!q||[item.id,item.service,item.country,item.country_code,item.phone_number,item.code,item.status].some(value=>String(value||"").toLowerCase().includes(q)));
 },[groups,tab,query]);

 async function copy(value:string,label:string){
  try{await navigator.clipboard.writeText(value);setCopyNotice(label+" copied");window.setTimeout(()=>setCopyNotice(""),1600);}
  catch{setCopyNotice("Copy unavailable on this device");window.setTimeout(()=>setCopyNotice(""),2200);}
 }

 return <div className="orders-page nx-orders-page">
  <TopBar title="Orders"/>
  <section className="orders-hero">
   <div><span className="eyebrow">YOUR ACTIVATIONS</span><h1>Orders</h1><p>Find your numbers, follow activation status and view received SMS.</p></div>
   <button className={"orders-refresh"+(refreshing?" spinning":"")} onClick={()=>{setRefreshing(true);void load()}} aria-label="Refresh orders" disabled={refreshing}>↻</button>
  </section>

  {loaded&&error?
   <div className="auth-page"><div className="form-card"><div className="orders-empty-icon">⌑</div><h2>Sign in required</h2><p>{error}</p><Link className="primary-btn full" href="/login">Sign in <span>→</span></Link><Link className="secondary-btn full" href="/signup">Create account</Link></div></div>
  :<>
   <div className="orders-stat-strip"><div><span>ACTIVE</span><b>{groups.active.length}</b></div><div><span>RECEIVED</span><b>{groups.received.length}</b></div><div><span>ALL ORDERS</span><b>{groups.all.length}</b></div></div>
   <label className="nx-orders-search"><span aria-hidden="true">⌕</span><input value={query} onChange={event=>setQuery(event.target.value)} placeholder="Search service, country, number or order ID…" aria-label="Search orders"/>{query&&<button type="button" onClick={()=>setQuery("")} aria-label="Clear search">×</button>}</label>
   <div className="orders-tabs nx-orders-tabs" role="tablist" aria-label="Order status filters">{tabs.map(item=><button key={item.id} role="tab" aria-selected={tab===item.id} className={tab===item.id?"selected":""} onClick={()=>setTab(item.id)}>{item.label}<b>{groups[item.id].length}</b></button>)}</div>
   {copyNotice&&<p className="nx-orders-copy-notice" role="status">{copyNotice}</p>}
   <div className="orders-list nx-orders-list">
    {visible.length?visible.map(item=>{
     const status=item.status.toLowerCase(),waiting=["waiting","cancelling"].includes(status),received=status==="received";
     const price=Number(item.price_usd);
     return <article className={"order-card "+(received?"received":"")+(waiting?" waiting":"")} key={item.id}>
      <div className="order-card-top">
       <div className={"order-service-icon "+(received?"good":"")}>{received?"✓":waiting?"◷":status==="failed"?"!":"↻"}</div>
       <div className="order-service-copy"><strong>{item.service||"SMS service"}</strong><small>{item.country||"Country unavailable"}{item.country_code?" · "+item.country_code:""}</small></div>
       <span className={"order-status "+(received?"good":"")}>{statusLabel(status)}</span>
      </div>
      <div className="order-number-box"><span>{item.phone_number||"Number not available"}</span>{item.phone_number&&<button type="button" className="nx-order-copy" onClick={()=>void copy(item.phone_number!,"Number")}>Copy</button>}</div>
      {item.code&&<div className="order-code-box"><span>VERIFICATION CODE</span><strong>{item.code}</strong><button type="button" className="nx-order-copy-code" onClick={()=>void copy(item.code!,"Code")}>Copy code</button><b>SMS RECEIVED</b></div>}
      <div className="order-card-footer"><span>{Number.isFinite(price)?"$"+price.toFixed(2)+" USD":"Price unavailable"}{waiting&&item.expires_at?" · "+remaining(item.expires_at):""}</span>{waiting?<Link href={"/get-code/"+encodeURIComponent(item.id)}>Open activation <b>→</b></Link>:<span className="order-complete">{statusLabel(status)}</span>}</div>
      <div className="nx-order-reference">Order ID · {item.id}</div>
     </article>
    }):<div className="orders-empty"><div className="orders-empty-icon">{tab==="active"?"◷":tab==="received"?"✓":tab==="failed"?"!":"▤"}</div><h3>{query?"No matching orders":"No "+tabs.find(item=>item.id===tab)?.label.toLowerCase()}</h3><p>{query?"Try another search term.":"Your "+tabs.find(item=>item.id===tab)?.label.toLowerCase()+" will appear here when available."}</p>{tab==="all"&&<Link className="primary-btn" href="/services">Browse services <span>→</span></Link>}</div>}
   </div>
  </>}
 </div>;
}
