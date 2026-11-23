"use client";
import {useCallback,useEffect,useState} from "react";
const usd=(v:any)=>"$"+(Number(v)||0).toFixed(2);
type RequestRow={id:string;status:string;amountUsd:number;requester:{id:string;name:string;publicId:string};payer:{id:string;name:string;publicId:string};createdAt:string;receiptId?:string};
export default function WalletMoneyRequests(){
 const [rows,setRows]=useState<RequestRow[]>([]),[id,setId]=useState(""),[amount,setAmount]=useState(""),[note,setNote]=useState(""),[busy,setBusy]=useState(false),[error,setError]=useState(""),[receipt,setReceipt]=useState<any>(null);
 const load=useCallback(async()=>{const r=await fetch("/api/wallet/requests",{credentials:"include",cache:"no-store"});const d=await r.json();if(!r.ok)throw new Error(d.error||"Unable to load money requests.");setRows(Array.isArray(d.requests)?d.requests:[]);},[]);
 useEffect(()=>{load().catch(e=>setError(e.message));},[load]);
 async function create(){setBusy(true);setError("");try{const r=await fetch("/api/wallet/requests",{method:"POST",credentials:"include",headers:{"Content-Type":"application/json"},body:JSON.stringify({userId:id,amountUsd:Number(amount),note})});const d=await r.json();if(!r.ok)throw new Error(d.error||"Could not send request.");setId("");setAmount("");setNote("");await load();}catch(e:any){setError(e.message);}finally{setBusy(false);}}
 async function act(row:RequestRow,action:"confirm"|"reject"){setError("");if(action==="confirm"){const ok=window.confirm("Send "+usd(row.amountUsd)+" to "+row.requester.name+" (Numelixa ID "+row.requester.publicId+")? A successful transfer immediately debits your wallet and credits theirs.");if(!ok)return;}setBusy(true);try{const r=await fetch("/api/wallet/requests",{method:"PATCH",credentials:"include",headers:{"Content-Type":"application/json"},body:JSON.stringify({requestId:row.id,action})});const d=await r.json();if(!r.ok)throw new Error(d.error||"Could not process request.");await load();if(action==="confirm")setReceipt(d.receipt);}catch(e:any){setError(e.message);}finally{setBusy(false);}}
 return <section style={{margin:"20px 0",padding:20,border:"1px solid #24456a",borderRadius:20,background:"linear-gradient(145deg,#0b1d37,#081426)",color:"#eef6ff"}}>
  <div style={{display:"flex",justifyContent:"space-between",gap:12,alignItems:"center"}}><div><small style={{color:"#00d9ff",fontWeight:800,letterSpacing:1}}>PERSON-TO-PERSON WALLET</small><h2 style={{margin:"5px 0"}}>Request money</h2><p style={{margin:0,color:"#a9bad0",fontSize:13}}>Send a secure request to another Numelixa user by their 7-digit ID.</p></div><span aria-hidden="true" style={{fontSize:26}}>⇄</span></div>
  <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:10,marginTop:16}}>
   <label style={{fontSize:12,color:"#b6c7dc"}}>User Numelixa ID<input value={id} onChange={e=>setId(e.target.value.replace(/\D/g,"").slice(0,7))} inputMode="numeric" maxLength={7} placeholder="7-digit ID" style={field}/></label>
   <label style={{fontSize:12,color:"#b6c7dc"}}>Amount (USD)<input value={amount} onChange={e=>setAmount(e.target.value)} type="number" min="0.01" step="0.01" placeholder="10.00" style={field}/></label>
   <label style={{fontSize:12,color:"#b6c7dc"}}>Note (optional)<input value={note} onChange={e=>setNote(e.target.value.slice(0,140))} placeholder="What is this for?" style={field}/></label>
  </div>
  <button disabled={busy||id.length!==7||!(Number(amount)>0)} onClick={create} style={primary}>{busy?"Please wait…":"Send money request"}</button>
  {error&&<p role="alert" style={{color:"#ff9eae"}}>{error}</p>}
  <h3 style={{margin:"22px 0 8px",fontSize:14}}>Request activity</h3>
  {rows.length===0?<p style={{color:"#a9bad0",fontSize:13}}>No money requests yet.</p>:rows.map(row=><RequestItem key={row.id} row={row} onAction={act} busy={busy}/>)}
  {receipt&&<div role="dialog" aria-modal="true" style={{position:"fixed",inset:0,zIndex:1000,background:"#000b",display:"grid",placeItems:"center",padding:18}}><div style={{width:"min(440px,100%)",padding:22,borderRadius:20,background:"#0b1d37",border:"1px solid #2b6385",color:"white"}}><h2>Transfer complete</h2><strong style={{fontSize:28,color:"#00e5c3"}}>{usd(receipt.amountUsd)}</strong><p>Receipt: {receipt.receiptId}</p><p>Paid to: {receipt.paidTo?.name} · ID {receipt.paidTo?.publicId}</p><p>Paid at: {receipt.paidAt?new Date(receipt.paidAt).toLocaleString():"—"}</p><button style={primary} onClick={()=>setReceipt(null)}>Confirm and close receipt</button></div></div>}
 </section>;
}
const field:React.CSSProperties={display:"block",boxSizing:"border-box",width:"100%",marginTop:6,padding:"12px",borderRadius:10,border:"1px solid #315273",background:"#071329",color:"white",fontSize:14};
const primary:React.CSSProperties={marginTop:12,padding:"12px 18px",border:0,borderRadius:12,background:"#00d9ff",color:"#041326",fontWeight:800,cursor:"pointer"};
function RequestItem({row,onAction,busy}:{row:RequestRow;onAction:(r:RequestRow,a:"confirm"|"reject")=>void;busy:boolean}){
 const [incoming,setIncoming]=useState<boolean|null>(null);
 useEffect(()=>{fetch("/api/me",{credentials:"include",cache:"no-store"}).then(r=>r.json()).then(d=>setIncoming(String(d.user?.id||"")===row.payer.id)).catch(()=>setIncoming(false));},[row.payer.id]);
 const other=incoming?row.requester:row.payer;
 return <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",gap:10,padding:"12px 0",borderTop:"1px solid #1c3856",flexWrap:"wrap"}}><div><b>{incoming?"Request from ":"Request to "}{other.name}</b><div style={{fontSize:12,color:"#a9bad0"}}>ID {other.publicId} · {row.status.toUpperCase()}</div></div><strong>{usd(row.amountUsd)}</strong>{incoming&&row.status==="pending"&&<div style={{display:"flex",gap:8}}><button disabled={busy} onClick={()=>onAction(row,"reject")} style={{...primary,margin:0,background:"#293c55",color:"white"}}>Reject</button><button disabled={busy} onClick={()=>onAction(row,"confirm")} style={{...primary,margin:0}}>Confirm</button></div>}{row.receiptId&&<small style={{color:"#00e5c3"}}>Receipt {row.receiptId}</small>}</div>;
}
