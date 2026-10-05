"use client";

import TopBar from "@/components/TopBar";
import {useEffect,useMemo,useState} from "react";

type Pack={coins:number;priceUsd:number;popular?:boolean;paymentUrl?:string};
type Me={coins?:number;verified_at?:string|null};
type Pricing={coinsPerUsd:number;minTopupUsd:number;maxTopupUsd:number;coinPackages:Pack[]};

export default function Wallet(){
  const[u,setU]=useState<Me|null>(null),[pricing,setPricing]=useState<Pricing|null>(null),[loaded,setLoaded]=useState(false);
  const fixedPacks:Pack[]=[{coins:36,priceUsd:0.77},{coins:75,priceUsd:1.65},{coins:250,priceUsd:5.49},{coins:499,priceUsd:10.99}];
  const[selected,setSelected]=useState<number|null>(null),[error,setError]=useState(""),[loading,setLoading]=useState(false),[provider,setProvider]=useState<"paypal"|"nowpayments"|null>(null);

  useEffect(()=>{
    fetch("/api/me",{cache:"no-store"}).then(r=>r.json()).then(d=>{
      setU(d.user||null);setPricing(d.pricing||null);setProvider(d.paymentProvider==="paypal"?"paypal":"nowpayments");
      const packs:Array<Pack>=d.pricing?.coinPackages||[];
      if(fixedPacks.length)setSelected(fixedPacks[0].coins);
    }).catch(()=>setError("Unable to load wallet right now.")).finally(()=>setLoaded(true));
  },[]);

  const packs=useMemo(()=>fixedPacks,[fixedPacks]);
  const selectedPack=packs.find(p=>p.coins===selected)||null;

  async function pay(){
    if(!u){location.href="/login?next=/wallet";return}
    if(!u.verified_at){location.href="/verify-email";return}
    if(!selectedPack)return;
    setLoading(true);setError("");
    try{
      const d=await fetch("/api/payments/create",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({coins:selectedPack.coins})}).then(r=>r.json());
      if(!d.ok){setError(d.error||"Unable to create payment");return}
      location.href=d.url;
    }catch(err){setError(err instanceof Error?err.message:"Unable to create payment")}
    finally{setLoading(false)}
  }

  return <div>
    <TopBar title="Wallet"/>
    <section className="wallet-hero wallet-hero-new">
      <div className="wallet-orbit" aria-hidden="true">◈</div>
      <div className="wallet-balance-copy"><span>AVAILABLE COINS</span><strong>{u?Number(u.coins||0).toLocaleString():"—"}</strong><small>Coins are used for number purchases.</small></div>
      <div className="wallet-rate">{pricing?pricing.coinsPerUsd.toLocaleString()+" coins / $1":""}</div>
    </section>
    <div className="wallet-section-head"><div><span className="eyebrow">COIN STORE</span><h2>Choose your coins</h2><p>Pick a package set by the admin. Payment is securely processed.</p></div></div>
    {error&&<div className="error-box">{error}</div>}
    {!loaded?<div className="wallet-loading">Loading coin packages…</div>:!packs.length?<div className="helper-card"><b>No coin packages available</b><span>Please check back shortly.</span></div>:
      <div className="coin-store-grid">{packs.map(p=><button key={p.coins} type="button" className={"coin-store-card "+(selected===p.coins?"selected":"")} onClick={()=>setSelected(p.coins)}>
        {p.popular&&<span className="popular-badge">POPULAR</span>}<span className="coin-glyph">◈</span><strong>{p.coins.toLocaleString()}</strong><small>coins</small><b className="coin-price">{"$"+p.priceUsd.toFixed(2)}</b>
      </button>)}</div>}
    {selectedPack&&<section className="wallet-checkout"><div><span className="eyebrow">SELECTED PACKAGE</span><strong>{selectedPack.coins.toLocaleString()} coins</strong><small>{"Payment required: $"+selectedPack.priceUsd.toFixed(2)}</small></div>
      <button className="primary-btn wallet-pay-btn" onClick={pay} disabled={loading}>{loading?"Opening secure checkout…":u?provider==="paypal"?"Continue with PayPal":"Continue to secure payment":"Sign in to continue"}<span>→</span></button>
    </section>}
    <p className="wallet-footnote">{provider==="paypal"?"You will be redirected to PayPal to approve the payment. Coins are added only after PayPal confirms the completed payment.":"Coins are added only after the payment is confirmed."}</p>
  </div>
}
