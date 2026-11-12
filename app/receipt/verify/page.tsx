"use client";
import {useEffect,useState} from "react";
type Result={valid:boolean;receipt?:{receiptId:string;service:string;amountUsd:number;amountEtb:number;paidAt:string|null;referenceSuffix:string};error?:string};
const usd=(n:number)=>new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(n||0);
const etb=(n:number)=>new Intl.NumberFormat("en-ET",{minimumFractionDigits:2,maximumFractionDigits:2}).format(n||0);
export default function VerifyReceiptPage(){
 const [code,setCode]=useState(""),[result,setResult]=useState<Result|null>(null),[busy,setBusy]=useState(false);
 useEffect(()=>{const value=new URLSearchParams(window.location.search).get("code")||"";if(value)setCode(value.toUpperCase());},[]);
 async function verify(){setBusy(true);setResult(null);try{const r=await fetch("/api/receipts/verify?code="+encodeURIComponent(code.trim()),{cache:"no-store"});const d=await r.json();setResult(d);}catch{setResult({valid:false,error:"Connection problem. Please try again."});}finally{setBusy(false);}}
 return <main style={{minHeight:"70vh",padding:"30px 16px",color:"#f4f8ff"}}><section style={{maxWidth:560,margin:"0 auto",padding:26,border:"1px solid rgba(105,170,230,.22)",borderRadius:24,background:"linear-gradient(145deg,#0a1e3a,#061329)",boxShadow:"0 25px 70px rgba(0,0,0,.22)"}}>
  <div style={{display:"flex",alignItems:"center",gap:12}}><img src="/numelixa-brand.svg" width="48" height="48" alt="Numelixa"/><div><b style={{letterSpacing:".14em"}}>NUMELIXA</b><small style={{display:"block",color:"#8fa9c8",fontSize:9,letterSpacing:".12em"}}>OFFICIAL RECEIPT VERIFICATION</small></div></div>
  <h1 style={{fontSize:30,letterSpacing:"-.05em",margin:"24px 0 8px"}}>Verify a payment receipt</h1><p style={{color:"#9bb1cc",fontSize:12,lineHeight:1.7}}>Enter the code printed below the barcode. This page checks the official Numelixa payment ledger and shows whether the payment was verified and credited.</p>
  <label style={{display:"block",marginTop:20,fontSize:10,fontWeight:900,color:"#a9c3df"}}>RECEIPT CODE</label><input value={code} onChange={e=>setCode(e.target.value.toUpperCase())} placeholder="NX-0123456789ABCDEF" style={{width:"100%",boxSizing:"border-box",height:52,marginTop:8,padding:"0 14px",borderRadius:13,border:"1px solid rgba(120,170,220,.25)",background:"#061329",color:"#fff",fontWeight:850,letterSpacing:".08em"}}/>
  <button type="button" disabled={busy||!code.trim()} onClick={verify} style={{width:"100%",height:50,marginTop:12,border:0,borderRadius:13,background:"linear-gradient(100deg,#1677ff,#00bcd4)",color:"#fff",fontWeight:900}}>{busy?"Checking official ledger…":"Verify receipt"}</button>
  {result&&<div role="status" style={{marginTop:18,padding:17,borderRadius:15,border:"1px solid "+(result.valid?"rgba(0,229,195,.28)":"rgba(255,190,92,.28)"),background:result.valid?"rgba(0,229,195,.08)":"rgba(255,190,92,.07)"}}>
   <b style={{color:result.valid?"#6ff0d7":"#ffd28c"}}>{result.valid?"✓ VERIFIED — PAYMENT CREDITED":"Receipt not verified"}</b>
   {result.valid&&result.receipt?<div style={{display:"grid",gap:9,marginTop:13,fontSize:11}}><div>Receipt: <b>{result.receipt.receiptId}</b></div><div>Service: <b>{result.receipt.service}</b></div><div>Amount: <b>{usd(result.receipt.amountUsd)} · {etb(result.receipt.amountEtb)} ETB</b></div><div>Paid: <b>{result.receipt.paidAt?new Date(result.receipt.paidAt).toLocaleString("en-ET",{timeZone:"Africa/Addis_Ababa"}):"Verified"}</b></div>{result.receipt.referenceSuffix&&<div>Reference ending: <b>••••{result.receipt.referenceSuffix}</b></div>}</div>:<p style={{margin:"8px 0 0",fontSize:11,color:"#a9b9cf"}}>{result.error||"This code does not match a paid and credited Numelixa transaction."}</p>}
  </div>}
  <p style={{marginTop:20,fontSize:9,color:"#7893b2"}}>For privacy, this public check does not display customer phone numbers or wallet account details.</p>
 </section></main>;
}
