"use client";
import TopBar from "@/components/TopBar";
import {useEffect,useMemo,useState} from "react";
type User={coins?:number;verified_at?:string|null};
type Pricing={coinsPerUsd?:number;minTopupUsd?:number;maxTopupUsd?:number};
const money=(n:number)=>new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",minimumFractionDigits:2,maximumFractionDigits:2}).format(Number.isFinite(n)?n:0);
export default function Wallet(){
 const [user,setUser]=useState<User|null>(null),[pricing,setPricing]=useState<Pricing|null>(null),[loaded,setLoaded]=useState(false);
 const [amount,setAmount]=useState("5.00"),[error,setError]=useState(""),[busy,setBusy]=useState(false);
 const rate=Number(pricing?.coinsPerUsd)||100,min=Number(pricing?.minTopupUsd)||1,max=Math.min(Number(pricing?.maxTopupUsd)||10000,10000),value=Number(amount);
 const valid=Number.isFinite(value)&&Math.round(value*100)===value*100&&value>=min&&value<=max;
 const presets=useMemo(()=>[1,5,10,25,50].filter(x=>x>=min&&x<=max),[min,max]);
 useEffect(()=>{fetch("/api/me",{cache:"no-store",credentials:"include"}).then(r=>r.json()).then(d=>{setUser(d.user||null);setPricing(d.pricing||null);}).catch(()=>setError("Unable to load wallet. Please refresh the page.")).finally(()=>setLoaded(true));},[]);
 useEffect(()=>{const v=new URLSearchParams(window.location.search).get("amount");if(v&&/^\d+(?:\.\d{1,2})?$/.test(v))setAmount(Number(v).toFixed(2));},[]);
 function checkout(){setError("");if(!user){window.location.href="https://numelixa.com/login?next="+encodeURIComponent("/wallet?amount="+encodeURIComponent(amount));return;}if(!user.verified_at){window.location.href="/verify-email";return;}if(!valid){setError("Enter an amount between "+money(min)+" and "+money(max)+".");return;}setBusy(true);window.location.href="https://checkout.numelixa.com/?amount="+encodeURIComponent(value.toFixed(2));}
 return <div className="nx-wallet-page">
  <TopBar title="Wallet"/>
  <section className="nx-wallet-hero">
   <div className="nx-wallet-orb" aria-hidden="true">＄</div>
   <div className="nx-wallet-eyebrow">YOUR NUMELIXA WALLET</div>
   <div className="nx-wallet-balance">{loaded&&user?money(Number(user.coins||0)/rate):"—"}</div>
   <p>Your available balance, shown in USD.</p>
   <div className="nx-wallet-hero-foot"><span><i/> Wallet secured</span><span>USD · United States Dollar</span></div>
  </section>
  <section className="nx-wallet-content">
   <div className="nx-wallet-heading"><div><span className="eyebrow">ADD FUNDS</span><h1>How much would you like to add?</h1><p>Choose a quick amount or enter your own. Payment happens on Numelixa’s private checkout page.</p></div><span className="nx-wallet-lock">⌑ Secure</span></div>
   {error&&<div className="nx-checkout-error" role="alert">{error}</div>}
   <div className="nx-wallet-amount-grid">{presets.map(v=><button type="button" key={v} className={Number(amount)===v?"selected":""} onClick={()=>{setAmount(v.toFixed(2));setError("");}}><small>TOP UP</small><strong>{money(v)}</strong><span>{v===5?"Popular":v===10?"Recommended":"USD balance"}</span></button>)}</div>
   <section className="nx-wallet-custom"><label htmlFor="nx-wallet-custom-amount">Custom amount (USD)</label><div><span>$</span><input id="nx-wallet-custom-amount" type="number" inputMode="decimal" min={min} max={max} step="0.01" value={amount} onChange={e=>{setAmount(e.target.value);setError("");}}/><small>USD</small></div><p>Minimum {money(min)} · Maximum {money(max)}</p>{!valid&&<small className="nx-validation">Enter an amount between {money(min)} and {money(max)}.</small>}</section>
   <section className="nx-wallet-checkout-summary"><div><span>Top-up amount</span><strong>{money(value)}</strong></div><div><span>Processing fee</span><strong>$0.00</strong></div><div className="total"><span>Total</span><strong>{money(value)}</strong></div><button type="button" disabled={!loaded||busy||!valid} onClick={checkout}>{busy?"Opening secure checkout…":"Continue to checkout"} <span>→</span></button><small><i/> Payments are verified server-side before your USD wallet balance is updated.</small></section>
   <div className="nx-wallet-methods"><div><span>▰</span><div><b>Visa / Mastercard</b><small>Bank cards where direct processing is enabled</small></div></div><div><span>◉</span><div><b>Waafi · EVC · ZAAD · SAHAL</b><small>Approve directly from your mobile wallet</small></div></div><div><span>₿</span><div><b>Crypto</b><small>Supported assets and networks</small></div></div></div>
  </section>
 </div>;
}
