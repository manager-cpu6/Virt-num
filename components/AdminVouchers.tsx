"use client";
import {useCallback,useEffect,useState} from "react";
type Voucher={id:string;code:string;amountUsd:number;status:string;redemptions:number;maxRedemptions:number;expiresAt:string;createdAt:string};
export default function AdminVouchers(){
 const [rows,setRows]=useState<Voucher[]>([]),[amount,setAmount]=useState("5"),[limit,setLimit]=useState("1"),[expiry,setExpiry]=useState(""),[busy,setBusy]=useState(false),[error,setError]=useState(""),[notice,setNotice]=useState("");
 const load=useCallback(async()=>{try{const r=await fetch("/api/admin/vouchers",{cache:"no-store"}),d=await r.json();if(!r.ok||!d.ok)throw new Error(d.error||"Unable to load vouchers.");setRows(d.vouchers||[])}catch(e){setError(e instanceof Error?e.message:"Unable to load vouchers.")}},[]);
 useEffect(()=>{void load()},[load]);
 async function create(e:React.FormEvent){e.preventDefault();setBusy(true);setError("");setNotice("");try{const r=await fetch("/api/admin/vouchers",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({amountUsd:Number(amount),maxRedemptions:Number(limit),expiresAt:expiry||undefined})}),d=await r.json();if(!r.ok||!d.ok)throw new Error(d.error||"Unable to create voucher.");setNotice("Voucher created: "+d.voucher.code);await navigator.clipboard?.writeText(d.voucher.code).catch(()=>{});await load()}catch(e){setError(e instanceof Error?e.message:"Unable to create voucher.")}finally{setBusy(false)}}
 return <div className="admin-card"><h2>Mobile voucher management</h2><p className="admin-help">Create codes for the Numelixa Android app. Voucher values are credited to the user's wallet only after server-side redemption. Codes are not displayed in the public website.</p>
  <form onSubmit={create} className="admin-form">
   <label>Voucher value (USD)<input type="number" min="0.01" max="100000" step="0.01" value={amount} onChange={e=>setAmount(e.target.value)} required/></label>
   <label>Maximum redemptions<input type="number" min="1" max="100000" step="1" value={limit} onChange={e=>setLimit(e.target.value)} required/></label>
   <label>Expiry date (optional)<input type="date" value={expiry} onChange={e=>setExpiry(e.target.value)}/></label>
   <button className="primary-btn" disabled={busy||Number(amount)<=0||Number(limit)<1}>{busy?"Creating…":"Generate voucher code"}</button>
  </form>
  {error&&<div className="error-box">{error}</div>}{notice&&<div className="success-box">{notice} · copied if clipboard permission was available.</div>}
  <div className="admin-stat-list" style={{marginTop:18}}><div className="admin-row"><b>Voucher code</b><b>Value · Redeemed / limit · Status</b></div>
   {!rows.length?<div className="country-loading">No voucher codes have been created.</div>:rows.map(x=><div className="admin-row" key={x.id}><span><b style={{fontFamily:"monospace"}}>{x.code}</b><small>Expires {x.expiresAt?new Date(x.expiresAt).toLocaleDateString():"—"}</small></span><strong>{x.amountUsd.toFixed(2)} USD · {x.redemptions}/{x.maxRedemptions} · {x.status}</strong></div>)}
  </div>
 </div>
}
