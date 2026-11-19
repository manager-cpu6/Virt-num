"use client";
import Link from "next/link";
import {useEffect,useState} from "react";
import ServiceLogo from "@/components/ServiceLogo";
const money=(n:number)=>new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",minimumFractionDigits:2,maximumFractionDigits:2}).format(n);
const methods=[
 {id:"coopay_ebirr",name:"Coopay eBirr",desc:"Cooperative Bank mobile wallet",group:"Wallet"},
 {id:"kaafi_ebirr",name:"Kaafi eBirr",desc:"Kaafi mobile wallet",group:"Wallet"},
 {id:"cbe_birr",name:"CBE Birr",desc:"Commercial Bank mobile wallet",group:"Wallet"},
 {id:"cbe_bank",name:"CBE Bank Transfer",desc:"Commercial Bank transfer",group:"Bank"},
 {id:"mpesa",name:"M-Pesa",desc:"Safaricom mobile money",group:"Wallet"},
 {id:"telebirr",name:"Telebirr",desc:"Ethio telecom mobile wallet",group:"Wallet"}
];
export default function LocalPaymentChooser(){
 const [amount,setAmount]=useState("5.00"),[available,setAvailable]=useState<Record<string,boolean>>({}),[somaliaOpen,setSomaliaOpen]=useState(false),[loading,setLoading]=useState(true);
 useEffect(()=>{const raw=new URLSearchParams(location.search).get("amount")||"5.00";if(/^\d+(?:\.\d{1,2})?$/.test(raw)&&Number(raw)>0)setAmount(Number(raw).toFixed(2));Promise.all([fetch("/api/payments/ethiopia/methods",{cache:"no-store"}).then(r=>r.json()),fetch("/api/payments/sifalo/status",{cache:"no-store"}).then(r=>r.json())]).then(([e,s])=>{const next:Record<string,boolean>={};for(const m of methods)next[m.id]=e?.ok===true&&e?.methods?.[m.id]?.open===true&&!!e?.methods?.[m.id]?.receiver&&Number(e?.etbPerUsd)>0;setAvailable(next);setSomaliaOpen(s?.ok===true&&s?.open===true&&s?.configured===true)}).catch(()=>{setAvailable({});setSomaliaOpen(false)}).finally(()=>setLoading(false));},[]);
 const goSomalia=()=>location.href="https://checkout.numelixa.com/?amount="+encodeURIComponent(amount),goEthiopia=(method:string)=>location.href="/ethiopia-payment?method="+encodeURIComponent(method)+"&amount="+encodeURIComponent(amount),back="/payment-method?amount="+encodeURIComponent(amount);
 const availableCount=methods.filter(m=>available[m.id]).length;
 return <main className="nx-local-pay-page">
  <div className="nx-local-pay-shell">
   <header className="nx-local-pay-nav"><Link href={back}>← Payment methods</Link><span><img src="/numelixa-brand.svg" alt="" width="26" height="26"/> NUMELIXA · SECURE CHECKOUT</span></header>
   <section className="nx-local-pay-hero"><span className="nx-guide-kicker">LOCAL PAYMENT</span><h1>Pay locally.<br/><em>Stay in control.</em></h1><p>Choose the country where you will send your payment. Only methods confirmed as enabled and configured by the payment service are selectable.</p></section>
   <section className="nx-local-pay-amount"><div><small>WALLET TOP-UP</small><strong>{money(Number(amount))}</strong></div><span>{loading?"Checking availability":"Availability checked live"}</span></section>
   <section className="nx-local-country-card">
    <div className="nx-local-country-head"><span className="nx-local-flag">🇸🇴</span><div><h2>Somalia</h2><p>Local mobile-money checkout</p></div><span className={"nx-local-status "+(loading?"checking":somaliaOpen?"open":"closed")}>{loading?"CHECKING":somaliaOpen?"AVAILABLE":"UNAVAILABLE"}</span></div>
    <p className="nx-local-country-copy">Supported Somali payment options and instructions are displayed by the secure checkout after availability is confirmed.</p>
    <button type="button" className="nx-local-continue" disabled={!somaliaOpen||loading} onClick={goSomalia}>Continue to Somalia payment <b>→</b></button>
   </section>
   <section className="nx-local-country-card">
    <div className="nx-local-country-head"><span className="nx-local-flag">🇪🇹</span><div><h2>Ethiopia</h2><p>Wallets and bank transfer</p></div><span className={"nx-local-status "+(loading?"checking":availableCount>0?"open":"closed")}>{loading?"CHECKING":availableCount+" / "+methods.length+" OPEN"}</span></div>
    <div className="nx-local-method-list">{methods.map(m=>{const open=available[m.id]===true;return <button key={m.id} type="button" disabled={!open||loading} onClick={()=>goEthiopia(m.id)} className={"nx-local-method"+(open?" enabled":"")}>
      <ServiceLogo id={m.id} name={m.name} className="nx-local-method-logo"/>
      <span className="nx-local-method-copy"><b>{m.name}</b><small>{m.desc}</small></span>
      <span className={"nx-local-method-state "+(open?"open":"closed")}>{loading?"CHECKING":open?"SELECT →":"CLOSED"}</span>
     </button>})}</div>
    <p className="nx-local-method-note">Closed methods cannot be selected. They become available only after the receiving account and service are configured and enabled.</p>
   </section>
   <footer className="nx-local-pay-footer"><span>© 2026 Numelixa</span><Link href="/wallet">Back to wallet</Link></footer>
  </div>
 </main>;
}
