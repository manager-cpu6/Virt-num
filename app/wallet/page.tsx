"use client";

import TopBar from "@/components/TopBar";
import {useEffect,useMemo,useState} from "react";

type Pack={coins:number;priceUsd:number;popular?:boolean;paymentUrl?:string};
type Me={coins?:number;verified_at?:string|null};
type Pricing={coinsPerUsd:number;minTopupUsd:number;maxTopupUsd:number;coinPackages:Pack[]};

export default function Wallet(){
  const[u,setU]=useState<Me|null>(null),[pricing,setPricing]=useState<Pricing|null>(null),[loaded,setLoaded]=useState(false),[clock,setClock]=useState(Date.now());
  const[deposit,setDeposit]=useState<any>(null),[depositStatus,setDepositStatus]=useState(""),[checkingDeposit,setCheckingDeposit]=useState(false);
  const[usdtNetworks,setUsdtNetworks]=useState<Array<{network:string;networkName:string;isDefault?:boolean}>>([]),[selectedNetwork,setSelectedNetwork]=useState("");
  const fixedPacks:Pack[]=[{coins:36,priceUsd:0.77},{coins:75,priceUsd:1.65},{coins:250,priceUsd:5.49},{coins:499,priceUsd:10.99}];
  const[selected,setSelected]=useState<number|null>(null),[error,setError]=useState(""),[loading,setLoading]=useState(false),[provider,setProvider]=useState<"paypal"|"nowpayments"|"binance"|null>(null);

  useEffect(()=>{const timer=window.setInterval(()=>setClock(Date.now()),1000);return()=>window.clearInterval(timer)},[]);

  useEffect(()=>{
    fetch("/api/me",{cache:"no-store"}).then(r=>r.json()).then(d=>{
      setU(d.user||null);setPricing(d.pricing||null);setProvider(d.paymentProvider==="paypal"?"paypal":d.paymentProvider==="binance"?"binance":"nowpayments");
      const packs:Array<Pack>=d.pricing?.coinPackages||[];
      if(fixedPacks.length)setSelected(fixedPacks[0].coins);
      if(d.paymentProvider==="binance"){
        fetch("/api/payments/binance/networks",{cache:"no-store"}).then(r=>r.json()).then(nr=>{
          if(!nr.ok)throw new Error(nr.error||"Unable to load USDT networks");
          const available=Array.isArray(nr.networks)?nr.networks.filter((n:any)=>n?.network&&n?.networkName):[];
          setUsdtNetworks(available);
          const preferred=available.find((n:any)=>n.isDefault)||available[0];
          if(preferred)setSelectedNetwork(preferred.network);
        }).catch(()=>setError("Unable to load USDT deposit networks. Please refresh and try again."));
      }
    }).catch(()=>setError("Unable to load wallet right now.")).finally(()=>setLoaded(true));
  },[]);

  const packs=useMemo(()=>fixedPacks,[fixedPacks]);
  const selectedPack=packs.find(p=>p.coins===selected)||null;
  const secondsLeft=deposit?.expiresAt?Math.max(0,Math.ceil((new Date(deposit.expiresAt).getTime()-clock)/1000)):0;
  const expiryLabel=String(Math.floor(secondsLeft/60)).padStart(2,"0")+":"+String(secondsLeft%60).padStart(2,"0");

  async function pay(){
    if(!u){location.href="/login?next=/wallet";return}
    if(!u.verified_at){location.href="/verify-email";return}
    if(!selectedPack)return;
    if(provider==="binance"){
      if(!selectedNetwork||!usdtNetworks.some(n=>n.network===selectedNetwork)){setError("Choose an available USDT deposit network first.");return;}
      location.href="https://payment.numelixa.com/?coins="+encodeURIComponent(String(selectedPack.coins))+"&network="+encodeURIComponent(selectedNetwork);return;
    }
    setLoading(true);setError("");
    try{
      const d=await fetch("/api/payments/create",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({coins:selectedPack.coins})}).then(r=>r.json());
      if(!d.ok){setError(d.error||"Unable to create payment");return}
      if(d.depositRequired){setDeposit(d);setDepositStatus("waiting");return}
      location.href=d.url;
    }catch(err){setError(err instanceof Error?err.message:"Unable to create payment")}
    finally{setLoading(false)}
  }

  async function copyValue(value:string){
    try{await navigator.clipboard.writeText(value);setDepositStatus("copied");window.setTimeout(()=>setDepositStatus("waiting"),1800);}
    catch{setError("Copy failed. Please select and copy the value manually.");}
  }
  async function checkDeposit(){
    if(!deposit?.orderId)return;
    setCheckingDeposit(true);setError("");
    try{
      const d=await fetch("/api/payments/binance/status?orderId="+encodeURIComponent(deposit.orderId),{cache:"no-store"}).then(r=>r.json());
      if(!d.ok){setError(d.error||"Unable to check deposit.");return}
      setDepositStatus(d.status);
      if(d.status==="paid"){
        const me=await fetch("/api/me",{cache:"no-store"}).then(r=>r.json());
        if(me.user)setU(me.user);
      }else if(d.status==="expired")setError("This deposit request expired. Please create a new payment request.");
    }catch{setError("Unable to check deposit status. Try again.");}
    finally{setCheckingDeposit(false);}
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
    {selectedPack&&<section className="wallet-checkout">
      <div><span className="eyebrow">SELECTED PACKAGE</span><strong>{selectedPack.coins.toLocaleString()} coins</strong><small>{"Payment required: $"+selectedPack.priceUsd.toFixed(2)}</small></div>
      {provider==="binance"&&<div style={{gridColumn:"1 / -1",width:"100%",marginTop:12}}>
        <span className="eyebrow">USDT DEPOSIT NETWORK</span>
        <p style={{margin:"6px 0 12px",opacity:.8}}>Choose the network that matches the wallet you will send from. Only USDT networks enabled for deposits are shown.</p>
        {usdtNetworks.length? <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(190px,1fr))",gap:10}}>
          {usdtNetworks.map(n=><button key={n.network} type="button" onClick={()=>{setSelectedNetwork(n.network);setError("");}} aria-pressed={selectedNetwork===n.network} style={{textAlign:"left",padding:13,borderRadius:12,border:selectedNetwork===n.network?"2px solid #00d9ff":"1px solid #355579",background:selectedNetwork===n.network?"rgba(0,217,255,.12)":"rgba(7,19,41,.7)",color:"inherit",cursor:"pointer"}}>
            <strong>{n.networkName}</strong><small style={{display:"block",opacity:.75,marginTop:4}}>USDT · {n.network}</small>{n.isDefault&&<small style={{display:"block",color:"#00e5c3",marginTop:5}}>Recommended</small>}
          </button>)}
        </div>:<small role="status">Loading supported deposit networks…</small>}
      </div>}
      <button className="primary-btn wallet-pay-btn" onClick={pay} disabled={loading||(provider==="binance"&&(!selectedNetwork||!usdtNetworks.some(n=>n.network===selectedNetwork)))}>{loading?"Opening secure checkout…":u?provider==="paypal"?"Continue with PayPal":provider==="binance"?"Get "+selectedPack.coins.toLocaleString()+" coins":"Continue to secure payment":"Sign in to continue"}<span>→</span></button>
    </section>}
    {deposit&&<section className="wallet-checkout" style={{display:"block",marginTop:20}}>
      <div style={{display:"grid",gap:12}}>
        <span className="eyebrow">SECURE USDT PAYMENT</span>
        <h2 style={{margin:0}}>Send the exact amount</h2>
        {depositStatus!=="paid"&&<div className="wallet-expiry-countdown" role="timer" aria-live="polite" style={{display:"grid",gap:4,padding:14,borderRadius:14,background:"#101d32",border:"1px solid #263b5a"}}><small>TIME LEFT TO PAY</small><strong>{expiryLabel}</strong>{secondsLeft===0&&<span>This payment request has expired. Create a new request to pay.</span>}</div>}
        {depositStatus==="paid"?<div className="success-box">Deposit confirmed. {Number(deposit.coins).toLocaleString()} coins have been credited to your wallet.</div>:<p>Send only USDT on the exact network shown below. Your coins are credited after Binance confirms the deposit. This payment request expires in 15 minutes. Payments received after expiry are not accepted.</p>}
        <div><small>Exact amount</small><strong style={{display:"block",fontSize:26}}>{Number(deposit.amount).toFixed(2)} USDT <button type="button" className="secondary-btn" onClick={()=>copyValue(Number(deposit.amount).toFixed(2))}>Copy amount</button></strong></div>
        <div><small>Network — must match exactly</small><strong style={{display:"block"}}>{deposit.networkName||deposit.network}</strong></div>
        <div><small>Deposit address QR</small><div style={{display:"flex",justifyContent:"center",padding:14}}><img src={"https://api.qrserver.com/v1/create-qr-code/?size=220x220&margin=8&data="+encodeURIComponent(String(deposit.address||""))} alt="USDT deposit address QR code" width="220" height="220" style={{background:"#fff",padding:8,borderRadius:12,maxWidth:"100%"}}/></div><small>Binance deposit address</small><div style={{overflowWrap:"anywhere",fontWeight:700}}>{deposit.address}</div><button type="button" className="secondary-btn" onClick={()=>copyValue(String(deposit.address))}>Copy address</button></div>
        {deposit.memo&&<div><small>Memo / Tag (required)</small><strong>{deposit.memo}</strong><button type="button" className="secondary-btn" onClick={()=>copyValue(String(deposit.memo))}>Copy memo</button></div>}
        <p className="wallet-footnote">Do not send another coin or use a different network. Send the exact amount, including all decimal digits. Binance Personal API only checks confirmed USDT deposits.</p>
        <button className="primary-btn" type="button" onClick={checkDeposit} disabled={checkingDeposit||depositStatus==="paid"}>{checkingDeposit?"Checking deposit…":depositStatus==="paid"?"Deposit confirmed ✓":"Check deposit status"}</button>
        {depositStatus==="waiting"&&<small>Current status: waiting for a confirmed Binance deposit. Automatic checks run periodically.</small>}
        {depositStatus==="expired"&&<small>This request has expired. Start a new payment from the coin store.</small>}
      </div>
    </section>}
    <p className="wallet-footnote">{provider==="paypal"?"You will be redirected to PayPal to approve the payment. Coins are added only after PayPal confirms the completed payment.":provider==="binance"?"Send the exact USDT amount to the displayed address within 15 minutes. Coins are added only after a matching deposit is confirmed.":"Coins are added only after the payment is confirmed."}</p>
  </div>
}
