"use client";
import type {FormEvent,ReactNode} from "react";
import {useEffect,useMemo,useState} from "react";
import Link from "next/link";
import AdminNotifications from "@/components/AdminNotifications";
import AdminAppUpdate from "@/components/AdminAppUpdate";
import AdminSecurity from "@/components/AdminSecurity";import AdminAuthMethods from "@/components/AdminAuthMethods";
import AdminSupport from "@/components/AdminSupport";
import AdminHelpChat from "@/components/AdminHelpChat";
import AdminSupportTeam from "@/components/AdminSupportTeam";
import AdminServiceCatalog from "@/components/AdminServiceCatalog";

type Pack={coins:number;priceUsd:number;popular?:boolean};
type Stats={users:number;verifiedUsers?:number;activeNumbers:number;todayOrders:number;revenueCoins:number;walletCoins?:number;orderStatuses?:{status:string;count:number}[];topServices?:{service:string;count:number;coins:number}[];settings:{markupPercent:number;coinsPerUsd:number;minTopupUsd:number;maxTopupUsd:number;coinPackages:Pack[];providerOperator:string;providerOperators:string[];smsProvider:"5sim"|"tiger";provider5simEnabled?:boolean;providerTigerEnabled?:boolean};providers:{name:string;status:string;balance?:any;balanceError?:string}[]};
type User={id:string;email:string;name:string;role:string;coins:number;verified_at?:string|null;created_at?:string;suspended_at?:string|null;suspension_reason?:string};
type Order={id:string;user_id:string;name:string;email:string;provider_order_id:string;service:string;service_display?:string;country:string;country_code:string;phone_number:string;provider_cost_usd:number;price_coins:number;status:string;code:string;full_sms:string;created_at:string;expires_at:string;cancelled_at?:string;completed_at?:string;refund_coins:number};

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
   const body={markupPercent:Number(f.get("markupPercent")),coinsPerUsd:Number(f.get("coinsPerUsd")),minTopupUsd:Number(f.get("minTopupUsd")),maxTopupUsd:Number(f.get("maxTopupUsd")),paymentExpiryMinutes:Number(f.get("paymentExpiryMinutes")),coinPackages,providerOperator:String(f.get("providerOperator")||"any"),smsProvider:String(f.get("smsProvider")||"5sim"),providerOperators:String(f.get("providerOperators")||"any").split(",").map(x=>x.trim().toLowerCase()).filter(Boolean)};
   const r=await fetch("/api/admin/stats",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)}),d=await r.json();
   if(d.ok){setStats({...stats,settings:d.settings});setSaved("Pricing saved.");setTimeout(()=>setSaved(""),2500)}else setError(d.error||"Unable to save")
 }

 async function deleteUser(user:User){
   if(user.role==="admin"){setError("Administrator accounts cannot be deleted here.");return}
   if(!confirm("Delete "+(user.email||user.name||"this user")+"? Their login sessions, API key and notification devices will be removed. This cannot be undone."))return;
   setError("");
   try{
    const response=await fetch("/api/admin/users",{method:"DELETE",headers:{"Content-Type":"application/json"},body:JSON.stringify({userId:user.id})});
    const data=await response.json();
    if(!response.ok||!data.ok){setError(data.error||"Unable to delete user.");return}
    setUsers(rows=>rows.filter(row=>row.id!==user.id));
    setSaved("User deleted. Their email can register again.");
    window.setTimeout(()=>setSaved(""),3000);
    await loadStats();
   }catch{setError("Unable to delete user. Please try again.")}
 }

 async function setUserSuspension(user:User,action:"suspend"|"unsuspend"){
   let reason="";
   if(action==="suspend"){const answer=prompt("Explain why "+(user.email||"this account")+" is being suspended. The user will receive this reason by email.");if(answer===null)return;reason=answer.trim();if(!reason){setError("A suspension reason is required.");return}}
   if(!confirm(action==="suspend"?"Suspend "+user.email+" and end active sessions?":"Restore "+user.email+" and send a confirmation email?"))return;
   setError("");try{const r=await fetch("/api/admin/users",{method:"PATCH",headers:{"Content-Type":"application/json"},body:JSON.stringify({userId:user.id,action,reason})});const d=await r.json();if(!r.ok||!d.ok)throw new Error(d.error||"Unable to update account status.");setUsers(rows=>rows.map(row=>row.id===user.id?{...row,suspended_at:action==="suspend"?new Date().toISOString():null,suspension_reason:action==="suspend"?reason:""}:row));setSaved(action==="suspend"?"Account suspended and sessions revoked.":"Account restored; confirmation email attempted.");window.setTimeout(()=>setSaved(""),3500)}catch(e){setError(e instanceof Error?e.message:"Unable to update account status.")}
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

 async function cancelWaitingOrder(order:Order){
  if(String(order.status).toLowerCase()!=="waiting")return;
  if(!confirm("Cancel this waiting "+(order.service_display||order.service)+" order? The provider must confirm cancellation before the order is marked cancelled and coins are refunded."))return;
  setError("");setSaved("");
  try{
   const r=await fetch("/api/admin/orders",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({orderId:order.id})});
   const d=await r.json();
   if(!r.ok||!d.ok)throw new Error(d.error||"Unable to cancel waiting order.");
   setSaved(d.message||"Waiting order cancelled.");
   await loadData("orders");await loadStats();
  }catch(e){setError(e instanceof Error?e.message:"Unable to cancel waiting order.")}
 }

 const topUsers=useMemo(()=>[...users].sort((a,b)=>b.coins-a.coins),[users]);
 const waiting=useMemo(()=>orders.filter(o=>String(o.status).toLowerCase()==="waiting"),[orders]);

 return <div className="admin-shell">
  <header className="admin-header"><div><span className="eyebrow">NUMELIXA ADMIN</span><h1>Control center</h1><small className="admin-live">Live management dashboard</small></div><div className="admin-head-actions"><button className="secondary-btn" onClick={refresh}>{refreshing?"Refreshing…":"↻ Refresh"}</button><Link href="/" className="secondary-btn">Open app</Link></div></header>
  {error&&<div className="error-box">{error}<button onClick={()=>setError("")}>×</button></div>}{saved&&<div className="success-box">{saved}</div>}
  <div className="admin-tabs">{["overview","users","active otp","orders","pricing","providers","services","payments","notifications","authentication","app update","security","support"].map(x=><button key={x} className={tab===x?"tab active":"tab"} onClick={()=>setTab(x)}>{x==="payments"?"Payment orders":x}</button>)}</div>
  {tab==="overview"&&<Overview stats={stats} waiting={waiting.length}/>}
  {tab==="users"&&<UsersTable users={topUsers} onAdjust={adjustCoins} onDelete={deleteUser} onSuspension={setUserSuspension}/>}
  {tab==="active otp"&&<OrdersTable orders={waiting} title={"OTP currently waiting ("+waiting.length+")"} active onCancel={cancelWaitingOrder}/>}
  {tab==="orders"&&<OrdersTable orders={orders} title={"All orders ("+orders.length+")"} onCancel={cancelWaitingOrder}/>}
  {tab==="providers"&&<Providers stats={stats}/>}
  {tab==="services"&&<AdminServiceCatalog/>}
  {tab==="payments"&&<AdminPayments/>}
  {tab==="pricing"&&stats&&<PricingForm stats={stats} onSave={saveSettings}/>}
  {tab==="notifications"&&<AdminNotifications/>}
  {tab==="authentication"&&<AdminAuthMethods/>}
  {tab==="app update"&&<AdminAppUpdate/>}
  {tab==="security"&&<AdminSecurity/>}
  {tab==="support"&&<><AdminHelpChat/><AdminSupportTeam/><AdminSupport/></>}
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
   <label>Crypto payment checkout timer (minutes)<input name="paymentExpiryMinutes" type="number" min="1" max="1440" step="1" defaultValue={(stats.settings as any).paymentExpiryMinutes??15}/><small>Choose 1–1440 minutes. When a user cancels or leaves checkout, the amount reservation is released immediately; this timer controls only the visible checkout window.</small></label>
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
function UsersTable({users,onAdjust,onDelete,onSuspension}:{users:User[];onAdjust:(u:User,m:"add"|"remove"|"set")=>void;onDelete:(u:User)=>void;onSuspension:(u:User,a:"suspend"|"unsuspend")=>void}){const[q,setQ]=useState("");const list=users.filter(u=>(u.name+" "+u.email).toLowerCase().includes(q.toLowerCase()));return <Table title={"Users, status & email verification ("+list.length+")"}><div className="admin-search"><input value={q} onChange={e=>setQ(e.target.value)} placeholder="Search name or email…"/></div>{list.map(u=><div className="admin-user-row" key={u.id}><div><b>{u.name||"Unnamed user"}</b><small>{u.email}</small><span className={"admin-email-verification "+(u.verified_at?"is-verified":"is-unverified")}>{u.verified_at?"✓ Email verified":"! Email not verified"}</span><span className={"admin-email-verification "+(u.suspended_at?"is-unverified":"is-verified")}>{u.suspended_at?"Suspended":"Account active"}</span>{u.suspended_at&&<small>Reason: {u.suspension_reason||"Not specified"}</small>}<strong>{u.coins.toLocaleString()} coins</strong></div><div className="coin-actions"><button onClick={()=>onAdjust(u,"add")}>+ Add</button><button onClick={()=>onAdjust(u,"remove")}>− Remove</button><button onClick={()=>onAdjust(u,"set")}>Set</button>{u.role!=="admin"&&<button onClick={()=>onSuspension(u,u.suspended_at?"unsuspend":"suspend")}>{u.suspended_at?"Unsuspend":"Suspend"}</button>}{u.role!=="admin"&&<button className="admin-delete-user" onClick={()=>onDelete(u)}>Delete</button>}</div></div>)}</Table>}

function OrdersTable({orders,title,active=false,onCancel}:{orders:Order[];title:string;active?:boolean;onCancel:(order:Order)=>void}){return <Table title={title}>{!orders.length&&<div className="country-loading">No orders found.</div>}{orders.map(o=><div className="admin-order-card" key={o.id}><div className="admin-order-head"><b>{o.service_display||o.service} · {o.country}</b><span className={"status "+(active?"active":"")}>{o.status}</span></div><div className="admin-order-meta"><span>User: {o.name||o.email}</span><span>Phone: {o.phone_number||"Waiting for number"}</span><span>Price: {Number(o.price_coins||0).toLocaleString()} coins</span><span>Expires: {o.expires_at?new Date(o.expires_at).toLocaleString():"—"}</span></div>{(o.code||o.full_sms)&&<div className="admin-sms-box"><b>OTP / SMS</b><strong>{o.code||"No parsed code"}</strong><small>{o.full_sms||"No full SMS text"}</small></div>}<div className="admin-order-meta"><span>Provider order: {o.provider_order_id||"—"}</span><span>Created: {o.created_at?new Date(o.created_at).toLocaleString():"—"}</span></div>{String(o.status).toLowerCase()==="waiting"&&<div style={{display:"flex",justifyContent:"flex-end",marginTop:12}}><button className="secondary-btn" onClick={()=>onCancel(o)}>Cancel waiting order</button></div>}</div>)}</Table>}

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
 const[state,setState]=useState<any>(null),[clientId,setClientId]=useState(""),[secretKey,setSecretKey]=useState(""),[webshareHost,setWebshareHost]=useState(""),[websharePort,setWebsharePort]=useState(""),[webshareUsername,setWebshareUsername]=useState(""),[websharePassword,setWebsharePassword]=useState(""),[binanceApiKey,setBinanceApiKey]=useState(""),[binanceApiSecret,setBinanceApiSecret]=useState(""),[busy,setBusy]=useState(false),[msg,setMsg]=useState(""),[msgError,setMsgError]=useState(false),[binanceTest,setBinanceTest]=useState<any>(null);
 async function load(){const d=await fetch("/api/admin/payments",{cache:"no-store"}).then(r=>r.json());if(d.ok){setState(d);setWebshareHost((old:string)=>old||d.binance?.webshareHost||"");setWebsharePort((old:string)=>old||d.binance?.websharePort||"");}}
 useEffect(()=>{
  load();
  const refreshId=window.setInterval(load,30000);
  const tickId=window.setInterval(()=>setState((old:any)=>old?({...old,payments:(old.payments||[]).map((p:any)=>p.status==="pending"?({...p,secondsRemaining:Math.max(0,Number(p.secondsRemaining||0)-1)}):p)}):old),1000);
  return()=>{window.clearInterval(refreshId);window.clearInterval(tickId)};
 },[]);
 async function save(){setBusy(true);setMsg("");try{const d=await fetch("/api/admin/payments",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"save_paypal",clientId,secretKey})}).then(r=>r.json());setMsg(d.ok?"PayPal credentials saved and webhook connected.":d.error||"Unable to save PayPal.");if(d.ok){setClientId("");setSecretKey("");await load();}}finally{setBusy(false)}}
 async function saveBinanceConnection(){
  setBusy(true);setMsg("");setMsgError(false);setBinanceTest(null);
  try{
   const response=await fetch("/api/admin/payments",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"save_binance_connection",webshareHost,websharePort,webshareUsername,websharePassword,apiKey:binanceApiKey,apiSecret:binanceApiSecret})});
   const d=await response.json();setMsg(d.ok?(d.message||"Webshare and Binance settings saved."):d.error||"Unable to save Webshare settings.");setMsgError(!d.ok);
   if(d.ok){setWebshareUsername("");setWebsharePassword("");setBinanceApiKey("");setBinanceApiSecret("");await load();}
  }catch{setMsg("Unable to save Webshare and Binance settings.");setMsgError(true)}finally{setBusy(false)}
 }
 async function testBinance(){
  setBusy(true);setMsg("");setMsgError(false);setBinanceTest(null);
  try{const response=await fetch("/api/admin/payments",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"test_binance"})});const d=await response.json();
   setBinanceTest(d);setMsg(d.ok?d.message:d.error||"Binance connection test failed.");setMsgError(!d.ok);
  }catch{setMsg("Unable to contact the Binance test endpoint.");setMsgError(true)}finally{setBusy(false)}
 }
 async function activate(provider:"paypal"|"nowpayments"|"binance"){setBusy(true);setMsg("");setMsgError(false);try{const response=await fetch("/api/admin/payments",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"activate",provider})});const d=await response.json();setMsg(d.ok?"Payment method switched to "+(provider==="paypal"?"PayPal":provider==="binance"?"Binance Personal API":"NOWPayments")+".":d.error||"Unable to switch payment method.");setMsgError(!d.ok);if(d.ok)await load();}catch{setMsg("Unable to reach payment settings. Please try again.");setMsgError(true)}finally{setBusy(false)}}
 async function orderAction(p:any,operation:"cancel"|"activate"){if(operation==="cancel"&&!confirm("Cancel payment order "+p.orderId+" and release its amount reservation?"))return;setBusy(true);setMsg("");setMsgError(false);try{const response=await fetch("/api/admin/payments",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"payment_order_action",orderId:p.orderId,operation})});const d=await response.json();setMsg(d.ok?(d.message||"Payment order updated."):(d.error||"Unable to update payment order."));setMsgError(!d.ok);if(d.ok)await load();}catch{setMsg("Unable to update payment order. Please try again.");setMsgError(true)}finally{setBusy(false)}}
 async function clearAllPayments(){if(!confirm("CLEAR ALL payment orders? This permanently removes pending, cancelled, expired and paid payment records from the Admin Payment orders list. Paid history will also be deleted. This cannot be undone."))return;setBusy(true);setMsg("");setMsgError(false);try{const response=await fetch("/api/admin/payments",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"clear_all_payment_orders"})});const d=await response.json();setMsg(d.ok?"All payment orders cleared.":d.error||"Unable to clear payment orders.");setMsgError(!d.ok);if(d.ok)await load()}catch{setMsg("Unable to clear payment orders. Please try again.");setMsgError(true)}finally{setBusy(false)}}
 if(!state)return <Table title="Payment methods"><div className="country-loading">Loading payment settings…</div></Table>;
 const pendingPayments=(state.payments||[]).filter((p:any)=>p.status==="pending");
 const otherPayments=(state.payments||[]).filter((p:any)=>p.status!=="pending");
 return <div className="admin-payment-stack">
  <div style={{display:"flex",justifyContent:"flex-end",gap:10,alignItems:"center",flexWrap:"wrap"}}><button className="secondary-btn" disabled={busy||!(state.payments||[]).length} onClick={clearAllPayments}>Clear all payment orders</button></div>
  <Table title={"Pending crypto payment orders ("+pendingPayments.length+")"}>
   <p className="admin-help">Live pending Binance deposits. Time remaining updates every second; the list refreshes from the payment database every 30 seconds.</p>
   {!pendingPayments.length?<div className="country-loading">No pending USDT payments right now.</div>:pendingPayments.map((p:any)=><div key={p.orderId} className="admin-order-card" style={{marginBottom:12,border:"1px solid #284766",borderRadius:16,padding:16}}>
    <div className="admin-order-head"><b>{Number(p.coins).toLocaleString()} coins · {Number(p.exactAmount).toFixed(8)} {p.currency||"USDT"}</b><span className="status active">PENDING</span></div>
    <div className="admin-order-meta"><span>Network: {p.network||"—"}</span><span>Package price: ${Number(p.baseAmount).toFixed(2)}</span><span>User ID: {p.userId||"—"}</span></div>
    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,flexWrap:"wrap",marginTop:12}}>
     <div><small style={{display:"block",opacity:.75}}>TIME REMAINING</small><strong style={{fontSize:24,fontVariantNumeric:"tabular-nums",color:Number(p.secondsRemaining)<=120?"#ffba72":"#7debd2"}}>{String(Math.floor(Number(p.secondsRemaining||0)/60)).padStart(2,"0")}:{String(Number(p.secondsRemaining||0)%60).padStart(2,"0")}</strong></div>
     <div><small style={{display:"block",opacity:.75}}>EXPIRES</small><strong>{p.expiresAt?new Date(p.expiresAt).toLocaleString():"—"}</strong></div>
    </div>
    <small style={{display:"block",marginTop:8,opacity:.65}}>Order: {p.orderId}</small>
    <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:12}}><button className="secondary-btn" disabled={busy} onClick={()=>orderAction(p,"cancel")}>Cancel order & release amount</button></div>
   </div>)}
  </Table>
  <Table title={"Payment orders — history ("+otherPayments.length+")"}>
   <p className="admin-help">Cancelled and expired orders release their amount slot. Reactivating an order is allowed only when its exact amount is not reserved by another active checkout. Paid orders are read-only.</p>
   {!otherPayments.length?<div className="country-loading">No previous payment orders.</div>:otherPayments.map((p:any)=><div key={p.orderId} className="admin-order-card" style={{marginBottom:10,border:"1px solid #284766",borderRadius:14,padding:14}}>
    <div className="admin-order-head"><b>{Number(p.coins).toLocaleString()} coins · {Number(p.exactAmount).toFixed(8)} {p.currency}</b><span className={"status "+(p.status==="paid"?"active":"")}>{String(p.status).toUpperCase()}</span></div>
    <div className="admin-order-meta"><span>Package price: ${Number(p.baseAmount).toFixed(2)}</span><span>Network: {p.network||"—"}</span><span>Created: {p.createdAt?new Date(p.createdAt).toLocaleString():"—"}</span></div>
    <small style={{display:"block",marginTop:8,opacity:.65}}>Order: {p.orderId}</small>
    {p.status!=="paid"&&<div style={{marginTop:10}}><button className="secondary-btn" disabled={busy} onClick={()=>orderAction(p,"activate")}>Activate order</button></div>}
   </div>)}
  </Table>
  <div className="admin-two-col">
  <Table title="Active payment method">
   <div className="payment-provider-card"><div><b>NOWPayments</b><small>Existing crypto payment method</small></div><button className={state.activeProvider==="nowpayments"?"primary-btn":"secondary-btn"} disabled={busy||!state.nowpayments.configured} onClick={()=>activate("nowpayments")}>{state.activeProvider==="nowpayments"?"OPEN NOWPAYMENTS":"Open NOWPayments"}</button></div>
   <div className="payment-provider-card"><div><b>PayPal</b><small>PayPal REST API · dynamic checkout + webhook</small></div><button className={state.activeProvider==="paypal"?"primary-btn":"secondary-btn"} disabled={busy||!state.paypal.configured} onClick={()=>activate("paypal")}>{state.activeProvider==="paypal"?"OPEN PAYPAL":"Open PayPal"}</button></div>
   <p className="admin-help">Only one payment method is active at a time. Switching methods does not alter existing pending payments.</p>
   {msg&&<div className={msgError?"error-box":"success-box"}>{msg}</div>}
  <div className="payment-provider-card"><div><b>Binance Personal API · Webshare proxy</b><small>{state.binance?.configured?"Binance credentials and Webshare proxy configured · server-side routing enabled":"Configure Binance API credentials and Webshare proxy below before activating payments."}</small></div><button className={state.activeProvider==="binance"?"primary-btn":"secondary-btn"} disabled={busy||!state.binance?.configured} onClick={()=>activate("binance")}>{busy?"Activating…":state.activeProvider==="binance"?"BINANCE PERSONAL ACTIVE":"Activate Binance Personal"}</button></div>
   <div className="admin-form" style={{marginTop:14}}>
    <label>Webshare proxy host / IP<input value={webshareHost} onChange={e=>setWebshareHost(e.target.value)} placeholder="Webshare host or static proxy IP" autoComplete="off"/></label>
    <label>Webshare port<input value={websharePort} onChange={e=>setWebsharePort(e.target.value)} placeholder="Proxy port" inputMode="numeric" autoComplete="off"/></label>
    <label>Webshare username<input value={webshareUsername} onChange={e=>setWebshareUsername(e.target.value)} placeholder={state.binance?.webshareUsernamePreview||"Username (leave blank to keep saved)"} autoComplete="off"/></label>
    <label>Webshare password<input value={websharePassword} onChange={e=>setWebsharePassword(e.target.value)} placeholder="Password (leave blank to keep saved)" type="password" autoComplete="new-password"/></label>
    <label>Binance API key<input value={binanceApiKey} onChange={e=>setBinanceApiKey(e.target.value)} placeholder={state.binance?.apiKeyPreview||"Binance API key"} autoComplete="off"/></label>
    <label>Binance API secret<input value={binanceApiSecret} onChange={e=>setBinanceApiSecret(e.target.value)} placeholder="Secret (leave blank to keep saved)" type="password" autoComplete="new-password"/></label>
    <button className="primary-btn" disabled={busy||!webshareHost||!websharePort} onClick={saveBinanceConnection}>{busy?"Saving settings…":"Save Webshare & Binance settings"}</button>
   </div>
   <div style={{display:"flex",gap:10,flexWrap:"wrap",alignItems:"center",marginTop:12}}><button className="secondary-btn" disabled={busy||!state.binance?.configured} onClick={testBinance}>{busy?"Testing Binance…":"Test Binance via Webshare"}</button>{binanceTest?.ok&&<small>Network: {binanceTest.network} · Address: {binanceTest.addressPreview}</small>}</div>
   <p className="admin-help">All Binance API calls (including asset prices, network lookup, deposit addresses and deposit reconciliation) route through Webshare from the server. Credentials are encrypted before being stored in the database and are never returned to the browser. Use a Binance API key with wallet/deposit read permissions only; do not enable withdrawals or trading. Leave secret fields blank to keep saved credentials.</p>
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
 </div>
}
