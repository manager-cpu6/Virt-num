"use client";
import Link from "next/link";
import {useEffect,useState} from "react";
const money=(n:number)=>new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",minimumFractionDigits:2,maximumFractionDigits:2}).format(n);
const ethiopianMethods=["coopay_ebirr","kaafi_ebirr","cbe_birr","cbe_bank","mpesa","telebirr"];
export default function LocalPaymentChooser(){
 const [amount,setAmount]=useState("5.00"),[ethiopiaOpen,setEthiopiaOpen]=useState(false),[somaliaOpen,setSomaliaOpen]=useState(false),[loading,setLoading]=useState(true),[launching,setLaunching]=useState(false),[launchError,setLaunchError]=useState("");
 useEffect(()=>{
  const raw=new URLSearchParams(location.search).get("amount")||"5.00";
  if(/^\d+(?:\.\d{1,2})?$/.test(raw)&&Number(raw)>0)setAmount(Number(raw).toFixed(2));
  Promise.all([
   fetch("/api/payments/ethiopia/methods",{cache:"no-store"}).then(r=>r.json()),
   fetch("/api/payments/sifalo/status",{cache:"no-store"}).then(r=>r.json())
  ]).then(([e,s])=>{
   const enabled=ethiopianMethods.some(id=>e?.ok===true&&e?.methods?.[id]?.open===true&&!!e?.methods?.[id]?.receiver);
   setEthiopiaOpen(enabled&&Number(e?.etbPerUsd)>0);
   setSomaliaOpen(s?.ok===true&&s?.open===true&&s?.configured===true);
  }).catch(()=>{setEthiopiaOpen(false);setSomaliaOpen(false)}).finally(()=>setLoading(false));
 },[]);
 const goSomalia=()=>location.href="https://checkout.numelixa.com/?amount="+encodeURIComponent(amount);
 const goEthiopia=async()=>{if(launching)return;setLaunching(true);setLaunchError("");try{const response=await fetch("/api/payments/ethiopia/session",{method:"POST",credentials:"include",headers:{"Content-Type":"application/json"}});const data=await response.json();if(!response.ok||!data.ok)throw new Error(data.error||"Please sign in to your wallet, then try again.");location.href="https://ethio.virtunumber.online/?amount="+encodeURIComponent(amount)+"&checkout="+encodeURIComponent(data.token);}catch(error){setLaunchError(error instanceof Error?error.message:"Unable to open Ethiopia checkout.");setLaunching(false);}};
 const back="/payment-method?amount="+encodeURIComponent(amount);
 return <main className="nx-local-pay-page"><div className="nx-local-pay-shell">
  <header className="nx-local-pay-nav"><Link href={back}>← Payment methods</Link><span><img src="/numelixa-brand.svg" alt="" width="26" height="26"/> NUMELIXA · SECURE CHECKOUT</span></header>
  <section className="nx-local-pay-hero"><span className="nx-guide-kicker">LOCAL PAYMENT</span><h1>Choose your<br/><em>payment country.</em></h1><p>Select where you will make your payment. Each country opens its own secure checkout with the relevant payment providers and instructions.</p></section>
  <section className="nx-local-pay-amount"><div><small>WALLET TOP-UP</small><strong>{money(Number(amount))}</strong></div><span>{loading?"Checking availability":"Secure checkout availability checked"}</span></section>
  <section className="nx-local-country-card">
   <div className="nx-local-country-head"><span className="nx-local-flag">🇪🇹</span><div><h2>Ethiopian Payment</h2><p>eBirr · CBE · M-Pesa · local banks</p></div><span className={"nx-local-status "+(loading?"checking":ethiopiaOpen?"open":"closed")}>{loading?"CHECKING":ethiopiaOpen?"AVAILABLE":"UNAVAILABLE"}</span></div>
   <p className="nx-local-country-copy">Continue to the dedicated Ethiopia payment portal to select Coopay eBirr, Kaafi eBirr, CBE Birr, M-Pesa or another enabled method. You will see the provider logo, exact ETB amount and verified receipt there.</p>
   <button type="button" className="nx-local-continue" disabled={loading||!ethiopiaOpen||launching} onClick={goEthiopia}>{launching?"Opening secure checkout…":"Continue to Ethiopian Payment"} <b>→</b></button>{launchError&&<p role="alert" style={{color:"#ffb8a8",fontSize:13,marginTop:10}}>{launchError}</p>}
  </section>
  <section className="nx-local-country-card">
   <div className="nx-local-country-head"><span className="nx-local-flag">🇸🇴</span><div><h2>Somalia Payment</h2><p>Local mobile-money checkout</p></div><span className={"nx-local-status "+(loading?"checking":somaliaOpen?"open":"closed")}>{loading?"CHECKING":somaliaOpen?"AVAILABLE":"UNAVAILABLE"}</span></div>
   <p className="nx-local-country-copy">Continue to the Somalia checkout for the available mobile-wallet payment services and their secure instructions.</p>
   <button type="button" className="nx-local-continue" disabled={loading||!somaliaOpen} onClick={goSomalia}>Continue to Somalia Payment <b>→</b></button>
  </section>
  <footer className="nx-local-pay-footer"><span>© 2026 Numelixa · Serving since 2023</span><Link href="/wallet">Back to wallet</Link></footer>
 </div></main>;
}
