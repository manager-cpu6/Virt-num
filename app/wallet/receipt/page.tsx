"use client";
import {useEffect,useState} from "react";
import PaymentReceipt from "@/components/PaymentReceipt";
export default function WalletReceiptPage(){
 const [receipt,setReceipt]=useState<any>(null),[error,setError]=useState("");
 useEffect(()=>{const reference=new URLSearchParams(window.location.search).get("reference")||"";if(!reference){setError("No transaction reference was supplied.");return;}fetch("/api/wallet/receipt?reference="+encodeURIComponent(reference),{cache:"no-store",credentials:"include"}).then(async r=>{const d=await r.json();if(!r.ok||!d.ok)throw new Error(d.error||"Unable to load receipt.");setReceipt(d.receipt);}).catch(e=>setError(e instanceof Error?e.message:"Unable to load receipt."));},[]);
 return <div className="nx-wallet-page"><div style={{maxWidth:760,margin:"0 auto",padding:"12px 0 90px"}}><a href="/wallet" style={{color:"#80caff",fontSize:12}}>← Back to wallet</a>{error?<p role="alert" style={{marginTop:20,color:"#ffb5c2"}}>{error}</p>:<PaymentReceipt receipt={receipt} onContinue={()=>location.href="/wallet"}/>}</div></div>;
}
