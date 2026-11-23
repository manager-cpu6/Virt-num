"use client";
import TopBar from "@/components/TopBar";
import WalletMoneyRequests from "@/components/WalletMoneyRequests";
import {useEffect,useMemo,useState} from "react";
type User={coins?:number;verified_at?:string|null};
type Pricing={coinsPerUsd?:number;minTopupUsd?:number;maxTopupUsd?:number};
const money=(n:number)=>new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",minimumFractionDigits:2,maximumFractionDigits:2}).format(Number.isFinite(n)?n:0);
export default function Wallet(){
 const [user,setUser]=useState<User|null>(null),[pricing,setPricing]=useState<Pricing|null>(null),[loaded,setLoaded]=useState(false),[paymentNotice,setPaymentNotice]=useState(""),[transactions,setTransactions]=useState<any[]>([]);
 const [amount,setAmount]=useState("5.00"),[error,setError]=useState(""),[busy,setBusy]=useState(false),[historyFilter,setHistoryFilter]=useState("all"),[expandedTx,setExpandedTx]=useState<string|null>(null);
 const rate=Number(pricing?.coinsPerUsd)||100,min=Number(pricing?.minTopupUsd)||1,max=Math.min(Number(pricing?.maxTopupUsd)||10000,10000),value=Number(amount);
 const valid=Number.isFinite(value)&&Math.round(value*100)===value*100&&value>=min&&value<=max;
 const presets=useMemo(()=>[5,10,25,50].filter(x=>x>=min&&x<=max),[min,max]);
 const visibleTransactions=useMemo(()=>transactions.filter(tx=>{const type=String(tx.type||"").toLowerCase();if(historyFilter==="credits")return type==="credit";if(historyFilter==="refunds")return type==="refund";if(historyFilter==="debits")return !["credit","refund"].includes(type);return true;}).slice(0,5),[transactions,historyFilter]);
 useEffect(()=>{const params=new URLSearchParams(window.location.search);if(params.get("payment")==="success"){const reference=params.get("reference")||"";if(reference){window.location.replace("/wallet/receipt?reference="+encodeURIComponent(reference));return;}setPaymentNotice("Payment confirmed. Your wallet balance has been refreshed.");}fetch("/api/me",{cache:"no-store",credentials:"include"}).then(r=>r.json()).then(d=>{setUser(d.user||null);setPricing(d.pricing||null);}).catch(()=>setError("Unable to load wallet. Please refresh the page.")).finally(()=>setLoaded(true));fetch("/api/v1/transactions",{cache:"no-store",credentials:"include"}).then(r=>r.json()).then(d=>setTransactions(Array.isArray(d.transactions)?d.transactions:[])).catch(()=>setTransactions([]));},[]);
 useEffect(()=>{const v=new URLSearchParams(window.location.search).get("amount");if(v&&/^\d+(?:\.\d{1,2})?$/.test(v))setAmount(Number(v).toFixed(2));},[]);
 function checkout(){setError("");if(!user){window.location.href="https://numelixa.com/login?next="+encodeURIComponent("/wallet?amount="+encodeURIComponent(amount));return;}if(!user.verified_at){window.location.href="/verify-email";return;}if(!valid){setError("Enter an amount between "+money(min)+" and "+money(max)+".");return;}setBusy(true);window.location.href="https://numelixa.com/payment-method?amount="+encodeURIComponent(value.toFixed(2));}
 return <div className="nx-wallet-page">
  <TopBar title="Wallet"/>
  <section className="nx-wallet-hero">
   <div className="nx-wallet-orb" aria-hidden="true">＄</div>
   <div className="nx-wallet-eyebrow">YOUR NUMELIXA WALLET</div>
   <div className="nx-wallet-balance">{loaded&&user?money(Number(user.coins||0)/rate):"—"}</div>
   <p>Your available balance, shown in USD.</p>
   <div className="nx-wallet-hero-foot"><span><i/> Wallet secured</span><span>USD · United States Dollar</span></div>
  </section>
  <WalletMoneyRequests/>
  <section className="nx-wallet-content">
   <div className="nx-wallet-heading"><div><span className="eyebrow">ADD FUNDS</span><h1>How much would you like to add?</h1><p>Choose a quick amount or enter your own. Ethiopia local transfers are calculated in ETB at the live rate; your USD wallet is credited only after the incoming payment SMS is verified.</p></div><span className="nx-wallet-lock">⌑ Secure</span></div>
   {paymentNotice&&<div className="nx-wallet-payment-success" role="status"><span>✓</span><div><b>Payment confirmed</b><small>{paymentNotice}</small></div></div>}
   {error&&<div className="nx-checkout-error" role="alert">{error}</div>}
   <div className="nx-wallet-amount-grid">{presets.map(v=><button type="button" key={v} className={Number(amount)===v?"selected":""} onClick={()=>{setAmount(v.toFixed(2));setError("");}}><small>TOP UP</small><strong>{money(v)}</strong><span>USD top-up</span></button>)}</div>
   <section className="nx-wallet-custom"><label htmlFor="nx-wallet-custom-amount">Custom amount (USD)</label><div><span>$</span><input id="nx-wallet-custom-amount" type="number" inputMode="decimal" min={min} max={max} step="0.01" value={amount} onChange={e=>{setAmount(e.target.value);setError("");}}/><small>USD</small></div><p>Minimum {money(min)} · Maximum {money(max)}</p>{!valid&&<small className="nx-validation">Enter an amount between {money(min)} and {money(max)}.</small>}</section>
   <section className="nx-wallet-checkout-summary"><div><span>Top-up amount</span><strong>{money(value)}</strong></div><div className="total"><span>Total</span><strong>{money(value)}</strong></div><button type="button" disabled={!loaded||busy||!valid} onClick={checkout}>{busy?"Opening secure checkout…":"Continue to checkout"} <span>→</span></button><small><i/> Payments are matched against the sender number, exact amount, transaction reference and receiving SIM before your wallet is credited.</small></section>
   <div className="nx-wallet-methods nx-wallet-methods-summary">
    <div><span className="nx-wallet-option-icon">◎</span><div><b>Local Payment</b><small>Available local methods are checked in secure checkout.</small></div></div>
    <div><span className="nx-wallet-option-icon">₿</span><div><b>Crypto Payment</b><small>Supported assets and networks are loaded from the live checkout service.</small></div></div>
    <p>Payment options and availability are confirmed when you continue. Methods that are not enabled are not presented as available.</p>
   </div>
   <section className="nx-wallet-guide">
    <div className="nx-wallet-guide-heading"><span className="eyebrow">A CLEAR, SECURE PROCESS</span><h2>From payment to wallet credit</h2><p>You can follow every stage. A payment request or screenshot alone never adds funds to your wallet.</p></div>
    <div className="nx-wallet-guide-grid">
     <article><span>01</span><b>Choose your amount</b><p>Select USD. The local checkout calculates the exact ETB amount using the current rate.</p></article>
     <article><span>02</span><b>Pay from your phone</b><p>Send the exact amount to the receiving account shown for your selected payment service.</p></article>
     <article><span>03</span><b>Automatic verification</b><p>Numelixa checks the incoming SMS, sender number, amount, transaction reference and receiving SIM before crediting.</p></article>
    </div>
    <div className="nx-wallet-receipt-note"><span>✓</span><div><b>Your verified payment comes with a receipt</b><small>Receipt number, payment reference, sender and receiver numbers, date, Addis Ababa time, exchange rate, barcode and official Numelixa verification stamp.</small></div></div>
   </section>
  </section>
  <section className="nx-wallet-history">
   <div className="nx-wallet-history-head"><div><span className="eyebrow">WALLET LEDGER</span><h2>Transaction history</h2><p>Confirmed credits, purchases and refunds recorded in your wallet ledger.</p></div><span>{transactions.length} records</span></div>
   <div className="nx-wallet-history-filters" role="group" aria-label="Transaction filters">{[["all","All"],["credits","Credits"],["debits","Debits"],["refunds","Refunds"]].map(([id,label])=><button key={id} type="button" className={historyFilter===id?"selected":""} onClick={()=>setHistoryFilter(id)}>{label}</button>)}</div>
   {transactions.length===0?<div className="nx-wallet-history-empty">Confirmed wallet ledger entries will appear here after your first transaction.</div>:visibleTransactions.length===0?<div className="nx-wallet-history-empty">No transactions match this filter.</div>:visibleTransactions.slice(0,30).map((tx:any)=>{
    const type=String(tx.type||"").toLowerCase(),credit=["credit","refund"].includes(type),expanded=expandedTx===String(tx.id);
    return <article className="nx-wallet-history-row" key={tx.id}>
     <span className={credit?"credit":"debit"}>{type==="refund"?"↶":credit?"＋":"−"}</span>
     <div><b>{tx.description||"Wallet transaction"}</b><small>{tx.createdAt?new Date(tx.createdAt).toLocaleString("en-ET",{dateStyle:"medium",timeStyle:"short"}):"Date unavailable"} · {tx.reference||"No reference"}</small></div>
     <strong className={credit?"credit":"debit"}>{credit?"+":"−"}{money(Math.abs(Number(tx.amountUsd)||0))}</strong>
     <button type="button" className="nx-wallet-detail-toggle" aria-expanded={expanded} onClick={()=>setExpandedTx(expanded?null:String(tx.id))}>{expanded?"Hide":"Details"}</button>
     {expanded&&<div className="nx-wallet-transaction-detail"><div><span>Type</span><b>{type||"Ledger entry"}</b></div><div><span>Amount</span><b>{money(Number(tx.amountUsd)||0)} USD</b></div><div><span>Balance after</span><b>{money(Number(tx.balanceAfterUsd)||0)} USD</b></div><div><span>Reference</span><b>{tx.reference||"Not provided"}</b></div><div><span>Transaction ID</span><b>{tx.id}</b></div></div>}
     {type==="credit"&&tx.reference?<a href={"/wallet/receipt?reference="+encodeURIComponent(tx.reference)}>View receipt →</a>:<span className="nx-wallet-history-muted">{type==="refund"?"Refund ledger entry":"Ledger record"}</span>}
    </article>;
   })}
   <p className="nx-wallet-history-disclaimer">This history shows posted wallet-ledger entries returned by the current API. Pending or failed payment attempts are not included in the current ledger response; a unified payment-attempt history requires a backend endpoint.</p>
  </section>
 </div>;
}
