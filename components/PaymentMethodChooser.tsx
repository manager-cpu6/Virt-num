"use client";
import {useEffect,useState} from "react";

const money=(n:number)=>new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",minimumFractionDigits:2,maximumFractionDigits:2}).format(n);

export default function PaymentMethodChooser(){
 const [amount,setAmount]=useState("5.00"),[localAvailable,setLocalAvailable]=useState(false),[loading,setLoading]=useState(true),[error,setError]=useState("");
 useEffect(()=>{const params=new URLSearchParams(window.location.search);const raw=params.get("amount")||"5.00";if(/^\d+(?:\.\d{1,2})?$/.test(raw)&&Number(raw)>0)setAmount(Number(raw).toFixed(2));fetch("/api/payments/sifalo/status",{cache:"no-store"}).then(r=>r.json()).then(d=>setLocalAvailable(d?.ok===true&&d?.open===true&&d?.configured===true)).catch(()=>setLocalAvailable(false)).finally(()=>setLoading(false));},[]);
 function goLocal(){window.location.href="https://checkout.numelixa.com/?amount="+encodeURIComponent(amount);}
 function goCrypto(){window.location.href="https://payment.numelixa.com/?amount="+encodeURIComponent(amount)+"&returnTo="+encodeURIComponent("https://numelixa.com/wallet?payment=success");}
 return <main className="nx-method-chooser">
  <div className="nx-method-chooser-wrap">
   <header className="nx-chooser-nav"><a href="https://numelixa.com/wallet" className="nx-chooser-brand"><span className="nx-chooser-logo">N</span><span><b>Numelixa</b><small>Secure wallet checkout</small></span></a><span className="nx-chooser-secure"><i/> SECURE PAYMENT</span></header>
   <section className="nx-chooser-hero"><span className="nx-chooser-eyebrow">WALLET TOP-UP · {money(Number(amount))}</span><h1>Choose how<br/><em>you want to pay.</em></h1><p>Select one of the payment options below. You’ll continue to a secure page for the method you choose.</p></section>
   {error&&<div className="nx-chooser-error" role="alert">{error}</div>}
   <section className="nx-chooser-options" aria-label="Payment methods">
    {(localAvailable||loading)&&<button className="nx-chooser-card nx-chooser-local" type="button" onClick={goLocal}>
      <span className="nx-chooser-card-top"><span className="nx-chooser-icon nx-local-icon"><svg viewBox="0 0 48 48" aria-hidden="true"><rect x="7" y="10" width="34" height="28" rx="8" fill="none" stroke="currentColor" strokeWidth="2.5"/><path d="M7 19h34M15 29h9" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"/></svg></span><span className="nx-chooser-arrow">↗</span></span>
      <strong>Local Payment</strong><span className="nx-chooser-desc">Pay directly using your mobile wallet.</span>
      <span className="nx-chooser-logos"><i className="nx-logo-waafi">W</i><i className="nx-logo-evc">EVC+</i><i className="nx-logo-zaad">ZAAD</i><i className="nx-logo-sahal">S</i><i className="nx-logo-edahab">eD</i><i className="nx-logo-premier">P</i></span>
      <span className="nx-chooser-cta">Continue with Local <b>→</b></span>
    </button>}
    <button className="nx-chooser-card nx-chooser-crypto" type="button" onClick={goCrypto}>
      <span className="nx-chooser-card-top"><span className="nx-chooser-icon nx-crypto-icon"><svg viewBox="0 0 48 48" aria-hidden="true"><circle cx="24" cy="24" r="19" fill="none" stroke="currentColor" strokeWidth="2.5"/><path d="M27 11v26M19 15h10a6 6 0 0 1 0 12H17h11a6 6 0 0 1 0 12H17" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/></svg></span><span className="nx-chooser-arrow">↗</span></span>
      <strong>Crypto Payment</strong><span className="nx-chooser-desc">Choose a coin, search assets and select its blockchain network.</span>
      <span className="nx-chooser-logos"><i className="nx-coin-btc">₿</i><i className="nx-coin-usdt">₮</i><i className="nx-coin-eth">◆</i><i className="nx-coin-bnb">◆</i><i className="nx-coin-usdc">$</i></span>
      <span className="nx-chooser-cta">Continue with Crypto <b>→</b></span>
    </button>
   </section>
   {!loading&&!localAvailable&&<p className="nx-chooser-note">Local payments are temporarily unavailable. You can continue with Crypto Payment.</p>}
   {loading&&<p className="nx-chooser-note">Checking available payment options…</p>}
   <footer className="nx-chooser-footer"><span>© 2026 Numelixa</span><span>Secure · Verified · USD</span><a href="https://numelixa.com/wallet">Back to wallet</a></footer>
  </div>
 </main>;
}
