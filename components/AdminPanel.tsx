"use client";
import type {FormEvent,ReactNode} from "react";
import {useEffect,useMemo,useState} from "react";
import Link from "next/link";
import AdminNotifications from "@/components/AdminNotifications";
import AdminSecurity from "@/components/AdminSecurity";import AdminAuthMethods from "@/components/AdminAuthMethods";
import AdminSupport from "@/components/AdminSupport";

type Pack={coins:number;priceUsd:number;popular?:boolean};
type Stats={users:number;verifiedUsers?:number;activeNumbers:number;todayOrders:number;revenueCoins:number;walletCoins?:number;orderStatuses?:{status:string;count:number}[];topServices?:{service:string;count:number;coins:number}[];settings:{markupPercent:number;coinsPerUsd:number;minTopupUsd:number;maxTopupUsd:number;coinPackages:Pack[];providerOperator:string;providerOperators:string[];smsProvider:"5sim"|"tiger";provider5simEnabled?:boolean;providerTigerEnabled?:boolean};providers:{name:string;status:string;balance?:any;balanceError?:string}[]};
type User={id:string;email:string;name:string;role:string;coins:number;verified_at?:string|null;created_at?:string};
type Order={id:string;user_id:string;name:string;email:string;provider_order_id:string;service:string;country:string;country_code:string;phone_number:string;provider_cost_usd:number;price_coins:number;status:string;code:string;full_sms:string;created_at:string;expires_at:string;cancelled_at?:string;completed_at?:string;refund_coins:number};

export default function AdminPanel(){
 const[stats,setStats]=useState<Stats|null>(null),[tab,setTab]=useState("overview"),[users,setUsers]=useState<User[]>([]),[orders,setOrders]=useState<Order[]>([]),[error,setError]=useState(""),[saved,setSaved]=useState(""),[refreshing,setRefreshing]=useState(false);
 async function loadStats(){const r=await fetch("/api/admin/stats",{cache:"no-store"});const d=await r.json();d.ok?setStats(d):setError(d.error||"Unable to load admin data")}
 async function loadData(t=tab){if(t==="users"){const r=await fetch("/api/admin/users",{cache:"no-store"});const d=await r.json();if(d.ok)setUsers(d.users||[]);else setError(d.error||"Unable to load users")}if(t==="orders"||t==="active otp"){const r=await fetch("/api/admin/orders",{cache:"no-store"});const d=await r.json();if(d.ok)setOrders(d.orders||[]);else setError(d.error||"Unable to load orders")}}
 async function refresh(){setRefreshing(true);setError("");await Promise.all([loadStats(),loadData(tab)]);setRefreshing(false)}
 useEffect(()=>{loadStats()},[]);
 useEffect(()=>{loadData(tab)},[tab]);

 async function saveSettings(e:FormEvent<HTMLFormElement>){
   e.preventDefault();if(!stats)return;
   const f=new FormData(e.currentTarget);
   const coinPackages=[0,1,2,3].map(i=>({
     coins:Number(f.get("coins"+i)),
     priceUsd:Number(f.get("price"+i)),
     popular:f.get("popular")===String(i)
   })).filter(p=>Number.isFinite(p.coins)&&p.coins>0&&Number.isFinite(p.priceUsd)&&p.priceUsd>0);
   const body={markupPercent:Number(f.get("markupPercent")),coinsPerUsd:Number(f.get("coinsPerUsd")),minTopupUsd:Number(f.get("minTopupUsd")),maxTopupUsd:Number(f.get("maxTopupUsd")),coinPackages,providerOperator:String(f.get("providerOperator")||"any"),smsProvider:String(f.get("smsProvider")||"5sim"),providerOperators:String(f.get("providerOperators")||"any").split(",").map(x=>x.trim().toLowerCase()).filter(Boolean)};
   const r=await fetch("/api/admin/stats",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)}),d=await r.json();
   if(d.ok){setStats({...stats,settings:d.settings});setSaved("Pricing saved.");setTimeout(()=>setSaved(""),2500)}else setError(d.error||"Unable to save")
 }

 async function adjustCoins(user:User,mode:"add"|"remove"|"set"){
   const raw=prompt(mode==="set"?"Set exact coin balance:":"Coins to "+mode+":");
   if(raw===null)return;
   const amount=Number(raw);
   if(!Number.isFinite(amount)||amount<0){setError("Enter a valid non-negative coin amount.");return}
   const r=await fetch("/api/admin/users/coins",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({userId:user.id,mode,amount})});
   const d=await r.json();if(!d.ok){setError(d.error||"Coin update failed");return}
   setUsers(v=>v.map(x=>x.id===user.id?{...x,coins:d.coins}:x))
 }

 const topUsers=useMemo(()=>[...users].sort((a,b)=>b.coins-a.coins),[users]);
 const waiting=useMemo(()=>orders.filter(o=>String(o.status).toLowerCase()==="waiting"),[orders]);

 return <div className="admin-shell">
  <header className="admin-header"><div><span className="eyebrow">NUMELIXA ADMIN</span><h1>Control center</h1><small className="admin-live">Live management dashboard</small></div><div className="admin-head-actions"><button className="secondary-btn" onClick={refresh}>{refreshing?"Refreshing…":"↻ Refresh"}</button><Link href="/" className="secondary-btn">Open app</Link></div></header>
  {error&&<div className="error-box">{error}<button onClick={()=>setError("")}>×</button></div>}{saved&&<div className="success-box">{saved}</div>}
  <div className="admin-tabs">{["overview","users","active otp","orders","pricing","providers","payments","notifications","authentication","security","support"].map(x=><button key={x} className={tab===x?"tab active":"tab"} onClick={()=>setTab(x)}>{x}</button>)}</div>
  {tab==="overview"&&<Overview stats={stats} waiting={waiting.length}/>}
  {tab==="users"&&<UsersTable users={topUsers} onAdjust={adjustCoins}/>}
  {tab==="active otp"&&<OrdersTable orders={waiting} title={"OTP currently waiting ("+waiting.length+")"} active/>}
  {tab==="orders"&&<OrdersTable orders={orders} title={"All orders ("+orders.length+")"}/>}
  {tab==="providers"&&<Providers stats={stats}/>}\n  {tab==="payments"&&<AdminPayments/>}
  {tab==="pricing"&&stats&&<PricingForm stats={stats} onSave={saveSettings}/>}
  {tab==="notifications"&&<AdminNotifications/>}
  {tab==="authentication"&&<AdminAuthMethods/>}
  {tab==="security"&&<AdminSecurity/>}
  {tab==="support"&&<AdminSupport/>}
 </div>
}

function PricingForm({stats,onSave}:{stats:Stats;onSave:(e:FormEvent<HTMLFormElement>)=>void}){
 const packs=stats.settings.coinPackages||[];
 const [operators,setOperators]=useState<string[]>(Array.from(new Set([...(stats.settings.providerOperators||[]),"any"])).map(x=>String(x).toLowerCase()));
 const [newOperator,setNewOperator]=useState("");
 function addOperator(){const v=newOperator.trim().toLowerCase();if(!v||operators.includes(v))return;setOperators([...operators,v]);setNewOperator("")}
 function removeOperator(v:string){if(v==="any")return;const next=operators.filter(x=>x!==v);setOperators(next);}
 return <Table title="Numelixa pricing & SMS providers">
  <form onSubmit={onSave} className="admin-form">
   <label>Active SMS purchase provider<select name="smsProvider" defaultValue={stats.settings.smsProvider||"5sim"}><option value="5sim">5SIM — New Protocol</option><option value="tiger">Tiger SMS</option></select><small>Switching affects new purchases, prices, countries and services. Existing activations stay pinned to the provider they were purchased from.</small></label>
   <label>Provider markup %<input name="markupPercent" type="number" min="0" step="0.1" defaultValue={stats.settings.markupPercent}/><small>This percentage is added to the active provider cost before customer coins are calculated.</small></label>
   <label>5SIM purchase operator<select name="providerOperator" defaultValue={stats.settings.providerOperator||"any"}>{operators.map(x=><option key={x} value={x}>{x==="any"?"Any operator":x}</option>)}</select><small>Any uses the provider's default operator. Named operators apply only where supported.</small></label>
   <div className="coin-package-admin"><div className="coin-package-admin-head"><div><b>5SIM operators</b><small>Add or remove operator names. “any” cannot be removed.</small></div></div><div className="coin-package-row"><input value={newOperator} onChange={e=>setNewOperator(e.target.value)} placeholder="e.g. tele2, mts, beeline"/><button type="button" className="secondary-btn" onClick={addOperator}>+ Add</button></div><input type="hidden" name="providerOperators" value={operators.join(",")}/><div className="admin-tags">{operators.map(x=><span className="admin-tag" key={x}>{x}<button type="button" onClick={()=>removeOperator(x)} disabled={x==="any"}>×</button></span>)}</div></div>
   <label>Coins per $1 USD<input name="coinsPerUsd" type="number" min="1" step="1" defaultValue={stats.settings.coinsPerUsd}/></label>
   <label>Minimum custom top-up USD<input name="minTopupUsd" type="number" min="0.01" step="0.01" defaultValue={stats.settings.minTopupUsd}/></label>
   <label>Maximum custom top-up USD<input name="maxTopupUsd" type="number" min="0.01" step="0.01" defaultValue={stats.settings.maxTopupUsd}/></label>
   <div className="coin-package-admin"><div className="coin-package-admin-head"><div><b>Wallet coin packages</b><small>Set the exact coins and payment price shown to customers. Package prices are independent of custom top-up limits.</small></div></div>{[0,1,2,3].map(i=>{const p=packs[i]||{coins:"",priceUsd:"",popular:false};return <div className="coin-package-row" key={i}><span className="coin-package-index">{i+1}</span><input name={"coins"+i} type="number" min="1" step="1" defaultValue={p.coins} placeholder="Coins"/><input name={"price"+i} type="number" min="0.01" step="0.01" defaultValue={p.priceUsd} placeholder="Price USD"/><label className="popular-check"><input name="popular" type="radio" value={String(i)} defaultChecked={Boolean(p.popular)}/><span>Popular</span></label></div>})}</div>
   <button className="primary-btn" type="submit">Save pricing & operator</button>
  </form>
 </Table>
}

function Overview({stats,waiting}:{stats:Stats|null;waiting:number}){
 const statuses=stats?.orderStatuses||[];
 const services=stats?.topServices||[];
 return <>
  <div className="admin-grid admin-grid-wide">{[["Total users",stats?.users??"—"],["Verified",stats?.verifiedUsers??"—"],["Waiting OTP",waiting],["Orders today",stats?.todayOrders??"—"],["Wallet coins",stats?Number(stats.walletCoins||0).toLocaleString():"—"],["Credit volume",stats?Number(stats.revenueCoins||0).toLocaleString():"—"]].map(([a,b])=><div className="metric" key={a}><span>{a}</span><strong>{b}</strong><small>live database</small></div>)}</div>
  <div className="admin-two-col">
   <Table title="Order status"><div className="admin-stat-list">{statuses.length?statuses.map(x=><div className="admin-row" key={x.status}><span><b>{x.status}</b><small>orders</small></span><strong>{x.count.toLocaleString()}</strong></div>):<div className="country-loading">No order data yet.</div>}</div></Table>
   <Table title="Top services"><div className="admin-stat-list">{services.length?services.map(x=><div className="admin-row" key={x.service}><span><b>{x.service}</b><small>{x.coins.toLocaleString()} coins</small></span><strong>{x.count.toLocaleString()}</strong></div>):<div className="country-loading">No service data yet.</div>}</div></Table>
  </div>
  <Table title="System health"><div className="check">✓ MongoDB storage connected</div><div className="check">✓ 5SIM live catalog and order integration</div><div className="check">✓ Cryptomus wallet payment integration</div><div className="check">✓ Spacemail transactional email integration</div></Table>
  <Table title="Admin control"><div className="admin-cap-grid"><div>Users & balances<small>Search users and add, remove or set coins.</small></div><div>Orders & OTP<small>Inspect phone, SMS, provider order, status and expiry.</small></div><div>Pricing & operators<small>Control markup, coin rate, packages and 5SIM operators.</small></div><div>Live monitoring<small>Track users, wallet coins, order status and service demand.</small></div></div></Table>
 </>
}
function UsersTable({users,onAdjust}:{users:User[];onAdjust:(u:User,m:"add"|"remove"|"set")=>void}){
 const[q,setQ]=useState(""),[busy,setBusy]=useState(""),[msg,setMsg]=useState("");
 const list=users.filter(u=>(u.name+" "+u.email).toLowerCase().includes(q.toLowerCase()));
 async function removeUser(u:User){
  const typed=prompt("Delete "+u.email+" permanently? Type DELETE to confirm.");
  if(typed!=="DELETE")return;
  setBusy(u.id);setMsg("");
  try{
   const r=await fetch("/api/admin/users",{method:"DELETE",headers:{"Content-Type":"application/json"},body:JSON.stringify({userId:u.id})});
   const d=await r.json();
   if(!d.ok){setMsg(d.error||"Unable to delete user.");return}
   setMsg("User deleted. Their email can register again.");
   window.location.reload();
  }catch{setMsg("Unable to contact server.")}
  finally{setBusy("")}
 }
 return <Table title={"Users & email verification ("+list.length+")"}>
  <div className="admin-search"><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search name or email…"/></div>
  {msg&&<div className="success-box">{msg}</div>}
  {list.map(u=><div className="admin-user-row" key={u.id}>
   <div><b>{u.name||"Unnamed user"}</b><small>{u.email}</small><strong>{u.coins.toLocaleString()} coins</strong>
    <span className={"admin-user-verification "+(u.verified_at?"verified":"unverified")}>{u.verified_at?"✓ Email verified":"! Email not verified"}</span>
   </div>
   <div className="coin-actions"><button onClick={()=>onAdjust(u,"add")}>+ Add</button><button onClick={()=>onAdjust(u,"remove")}>− Remove</button><button onClick={()=>onAdjust(u,"set")}>Set</button>{u.role!=="admin"&&<button className="danger-btn" disabled={busy===u.id} onClick={()=>removeUser(u)}>{busy===u.id?"Deleting…":"Delete"}</button>}</div>
  </div>)}
 </Table>
}

function OrdersTable({orders,title,active=false}:{orders:Order[];title:string;active?:boolean}){return <Table title={title}>{!orders.length&&<div className="country-loading">No orders found.</div>}{orders.map(o=><div className="admin-order-card" key={o.id}><div className="admin-order-head"><b>{o.service} · {o.country}</b><span className={"status "+(active?"active":"")}>{o.status}</span></div><div className="admin-order-meta"><span>User: {o.name||o.email}</span><span>Phone: {o.phone_number||"Waiting for number"}</span><span>Price: {Number(o.price_coins||0).toLocaleString()} coins</span><span>Expires: {o.expires_at?new Date(o.expires_at).toLocaleString():"—"}</span></div>{(o.code||o.full_sms)&&<div className="admin-sms-box"><b>OTP / SMS</b><strong>{o.code||"No parsed code"}</strong><small>{o.full_sms||"No full SMS text"}</small></div>}<div className="admin-order-meta"><span>Provider order: {o.provider_order_id||"—"}</span><span>Created: {o.created_at?new Date(o.created_at).toLocaleString():"—"}</span></div></div>)}</Table>}

function Table({title,children}:{title:string;children:ReactNode}){return <div className="admin-card"><h2>{title}</h2>{children}</div>}
function Providers({stats}:{stats:Stats|null}){
 const [busy,setBusy]=useState(false),[msg,setMsg]=useState("");
 if(!stats)return <Table title="SMS network control"><div className="country-loading">Loading provider control…</div></Table>;
 const s=stats.settings;
 async function apply(provider:"5sim"|"tiger",enabled:boolean){
  const five=provider==="5sim"?enabled:s.provider5simEnabled!==false;
  const tiger=provider==="tiger"?enabled:s.providerTigerEnabled!==false;
  if(!five&&!tiger){setMsg("At least one SMS provider must remain enabled.");return}
  setBusy(true);setMsg("");
  try{
   const r=await fetch("/api/admin/stats",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({providerControl:true,smsProvider:smsProviderFor(provider,enabled,five,tiger),provider5simEnabled:five,providerTigerEnabled:tiger})});
   const d=await r.json();
   if(!d.ok){setMsg(d.error||"Unable to update provider.");return}
   window.location.reload();
  }catch{setMsg("Unable to update provider control.")}
  finally{setBusy(false)}
 }
 function smsProviderFor(provider:"5sim"|"tiger",enabled:boolean,five:boolean,tiger:boolean){
  if(enabled)return provider;
  return five?"5sim":"tiger";
 }
 return <div className="provider-control-stack">
  <Table title="SMS Network Control">
   <div className="provider-control-intro"><span className="provider-control-pulse">●</span><div><b>One control plane</b><small>The active network owns catalog, pricing, stock, number purchase, OTP checks, cancellation and developer API traffic. Existing orders remain pinned to their original provider.</small></div></div>
   <div className="provider-control-grid">
    {(["5sim","tiger"] as const).map(id=>{
      const is5=id==="5sim",enabled=is5?s.provider5simEnabled!==false:s.providerTigerEnabled!==false,active=s.smsProvider===id;
      const p=stats.providers.find(x=>x.name.toLowerCase().replace(/\s/g,"")===id);
      return <div className={"provider-control-card "+(active?"is-active ":"")+(enabled?"":"is-disabled")} key={id}>
       <div className="provider-control-head"><div className={"provider-logo "+id}>{is5?"5":"T"}</div><div><b>{is5?"5SIM":"Tiger SMS"}</b><small>{active?"ACTIVE ROUTING":"STANDBY / OFF"}</small></div><span className={"provider-status "+(enabled?"on":"off")}>{enabled?"ON":"OFF"}</span></div>
       <div className="provider-control-copy">{active?"This provider currently controls Numelixa's live SMS network.":"Enable this network to make it available for routing."}</div>
       <div className="provider-control-actions">
        <button className={active?"primary-btn":"secondary-btn"} disabled={busy||(!enabled&&active)} onClick={()=>apply(id,true)}>{active?"Active":"Make active"}</button>
        <button className="secondary-btn" disabled={busy||!enabled||active} onClick={()=>apply(id,false)}>Turn off</button>
       </div>
       <div className="provider-balance"><span>LIVE BALANCE</span><strong>{p?.balance!==undefined?"$"+Number(p.balance).toFixed(4):"Balance unavailable"}</strong>{p?.balanceError&&<small className="provider-balance-error">{p.balanceError}</small>}</div>
      </div>
    })}
   </div>
   {msg&&<div className="error-box">{msg}</div>}
  </Table>
  <Table title="Provider services">
   <div className="admin-cap-grid"><div>Live catalog<small>Countries, services, stock and prices follow the active provider.</small></div><div>Number ordering<small>Customer purchases route through the active provider automatically.</small></div><div>OTP lifecycle<small>Check, finalize and cancel use the provider attached to each order.</small></div><div>Developer API<small>API orders use the same active Numelixa routing layer.</small></div></div>
  </Table>
 </div>
}


function AdminPayments(){
 const[state,setState]=useState<any>(null),[clientId,setClientId]=useState(""),[secretKey,setSecretKey]=useState(""),[busy,setBusy]=useState(false),[msg,setMsg]=useState("");
 async function load(){const d=await fetch("/api/admin/payments",{cache:"no-store"}).then(r=>r.json());if(d.ok)setState(d);}
 useEffect(()=>{load()},[]);
 async function save(){setBusy(true);setMsg("");try{const d=await fetch("/api/admin/payments",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"save_paypal",clientId,secretKey})}).then(r=>r.json());setMsg(d.ok?"PayPal credentials saved and webhook connected.":d.error||"Unable to save PayPal.");if(d.ok){setClientId("");setSecretKey("");await load();}}finally{setBusy(false)}}
 async function activate(provider:"paypal"|"nowpayments"){setBusy(true);setMsg("");try{const d=await fetch("/api/admin/payments",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"activate",provider})}).then(r=>r.json());setMsg(d.ok?"Payment method switched to "+(provider==="paypal"?"PayPal":"NOWPayments")+".":d.error||"Unable to switch payment method.");if(d.ok)await load();}finally{setBusy(false)}}
 if(!state)return <Table title="Payment methods"><div className="country-loading">Loading payment settings…</div></Table>;
 return <div className="admin-two-col">
  <Table title="Active payment method">
   <div className="payment-provider-card"><div><b>NOWPayments</b><small>Existing crypto payment method</small></div><button className={state.activeProvider==="nowpayments"?"primary-btn":"secondary-btn"} disabled={busy||!state.nowpayments.configured} onClick={()=>activate("nowpayments")}>{state.activeProvider==="nowpayments"?"OPEN NOWPAYMENTS":"Open NOWPayments"}</button></div>
   <div className="payment-provider-card"><div><b>PayPal</b><small>PayPal REST API · dynamic checkout + webhook</small></div><button className={state.activeProvider==="paypal"?"primary-btn":"secondary-btn"} disabled={busy||!state.paypal.configured} onClick={()=>activate("paypal")}>{state.activeProvider==="paypal"?"OPEN PAYPAL":"Open PayPal"}</button></div>
   <p className="admin-help">Only one payment method is active at a time. Switching methods does not alter existing pending payments.</p>
   {msg&&<div className="success-box">{msg}</div>}
  </Table>
  <Table title="PayPal credentials">
   <div className="admin-form">
    <label>Client ID<input value={clientId} onChange={e=>setClientId(e.target.value)} placeholder={state.paypal.clientId||"Paste PayPal Client ID"} autoComplete="off"/></label>
    <label>Secret Key<input value={secretKey} onChange={e=>setSecretKey(e.target.value)} placeholder="Paste PayPal Secret Key" type="password" autoComplete="new-password"/></label>
    <button className="primary-btn" disabled={busy||!clientId||!secretKey} onClick={save}>{busy?"Connecting PayPal…":"Save PayPal & connect webhook"}</button>
    <small>Credentials are stored server-side encrypted and are never returned to the browser after saving. PayPal payments use dynamic Orders and completed-capture verification.</small>
   </div>
  </Table>
 </div>
}
