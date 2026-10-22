"use client";
import {useEffect,useMemo,useRef,useState} from "react";

type Method="waafi"|"edahab"|"premier"|"card"|"crypto";
type AssetNetwork={network:string;networkName:string;isDefault?:boolean};
type Asset={coin:string;name:string;logo?:string;usdPrice:number;networks:AssetNetwork[]};
const money=(n:number)=>new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",minimumFractionDigits:2,maximumFractionDigits:2}).format(Number.isFinite(n)?n:0);
const networkLogo=(n:AssetNetwork)=>{
 const key=(n.network+" "+n.networkName).toLowerCase().replace(/[^a-z0-9]/g,"");
 const aliases:[string,string][]=[
  ["erc20","ethereum"],["ethereum","ethereum"],["eth","ethereum"],["trc20","tron"],["tron","tron"],
  ["bep20","binance"],["bsc","binance"],["bnbsmartchain","binance"],["polygon","polygon"],["matic","polygon"],
  ["solana","solana"],["sol","solana"],["avalanche","avalanche"],["avaxc","avalanche"],["arbitrum","arbitrum"],
  ["optimism","optimism"],["base","coinbase"],["ton","ton"],["bitcoin","bitcoin"],["btc","bitcoin"],
  ["litecoin","litecoin"],["dogecoin","dogecoin"],["xrp","xrpl"],["ripple","xrpl"],["aptos","aptos"],["sui","sui"]
 ];
 const slug=aliases.find(([needle])=>key.includes(needle))?.[1]||"blockchaindotcom";
 return "https://cdn.simpleicons.org/"+slug;
};

export default function FirstPartyCheckout(){
 const [amount,setAmount]=useState("5.00"),[minAmount,setMinAmount]=useState(1),[maxAmount,setMaxAmount]=useState(10000),[rate,setRate]=useState(100);
 const [user,setUser]=useState<any>(null),[localOpen,setLocalOpen]=useState(false),[method,setMethod]=useState<Method>("waafi"),[phone,setPhone]=useState("");
 const [busy,setBusy]=useState(false),[error,setError]=useState(""),[notice,setNotice]=useState(""),[order,setOrder]=useState<any>(null);
 const [assets,setAssets]=useState<Asset[]>([]),[asset,setAsset]=useState("USDT"),[network,setNetwork]=useState(""),[deposit,setDeposit]=useState<any>(null),[depositStatus,setDepositStatus]=useState("pending");
 const checking=useRef(false);
 const amountNumber=Number(amount),coins=Math.round(amountNumber*rate),validAmount=Number.isFinite(amountNumber)&&Math.round(amountNumber*100)===amountNumber*100&&amountNumber>=minAmount&&amountNumber<=maxAmount;
 const selectedAsset=assets.find(a=>a.coin===asset),networks=selectedAsset?.networks||[];

 useEffect(()=>{(async()=>{try{
  const initialAmount=new URLSearchParams(window.location.search).get("amount");if(initialAmount&&/^\d+(?:\.\d{1,2})?$/.test(initialAmount))setAmount(Number(initialAmount).toFixed(2));
  const [meRes,localRes]=await Promise.all([fetch("/api/me",{cache:"no-store",credentials:"include"}),fetch("/api/payments/sifalo/status",{cache:"no-store"})]);
  const me=await meRes.json(),local=await localRes.json();
  if(me.user){setUser(me.user);setRate(Number(me.pricing?.coinsPerUsd)||100);setMinAmount(Number(me.pricing?.minTopupUsd)||1);setMaxAmount(Number(me.pricing?.maxTopupUsd)||10000);}
  const canUseLocal=local.ok===true&&local.open===true&&local.configured===true;setLocalOpen(canUseLocal);if(!canUseLocal)setMethod("crypto");
 }catch{setError("Unable to load checkout settings. Refresh and try again.");}})()},[]);

 useEffect(()=>{if(method!=="crypto"||assets.length)return;let alive=true;(async()=>{try{const r=await fetch("/api/payments/binance/networks",{cache:"no-store",credentials:"include"});const d=await r.json();if(!r.ok||!d.ok)throw new Error(d.error||"Crypto payments are unavailable.");if(!alive)return;const list:Array<Asset>=d.assets||[];setAssets(list);const initial=list.find(x=>x.coin==="USDT")||list[0];if(initial){setAsset(initial.coin);setNetwork(initial.networks?.find(n=>n.isDefault)?.network||initial.networks?.[0]?.network||"");}}catch(e){if(alive)setError(e instanceof Error?e.message:"Unable to load crypto options.");}})();return()=>{alive=false}},[method,assets.length]);

 useEffect(()=>{if(!deposit?.orderId||depositStatus==="paid"||depositStatus==="failed")return;let stopped=false;const check=async()=>{if(checking.current||stopped)return;checking.current=true;try{const r=await fetch("/api/payments/binance/status?orderId="+encodeURIComponent(deposit.orderId),{cache:"no-store",credentials:"include"});const d=await r.json();if(d.ok){setDepositStatus(d.status);if(d.status==="paid"){setNotice("Payment confirmed. Your wallet balance is being refreshed.");fetch("/api/me",{cache:"no-store",credentials:"include"}).then(r=>r.json()).then(me=>{if(me.user)setUser(me.user)}).catch(()=>{});}}}catch{}finally{checking.current=false}};const timer=window.setInterval(check,8000);void check();return()=>{stopped=true;window.clearInterval(timer)}},[deposit?.orderId,depositStatus]);

 useEffect(()=>{if(!order?.orderId||order.status!=="pending")return;let stopped=false;const check=async()=>{if(stopped||checking.current)return;checking.current=true;try{const r=await fetch("/api/payments/sifalo/verify?orderId="+encodeURIComponent(order.orderId),{cache:"no-store",credentials:"include"});const d=await r.json();if(d.ok&&d.status==="paid"){setOrder((v:any)=>({...v,status:"paid"}));setNotice("Payment confirmed — your wallet balance has been updated.");fetch("/api/me",{cache:"no-store",credentials:"include"}).then(r=>r.json()).then(me=>{if(me.user)setUser(me.user)}).catch(()=>{});}else if(d.ok&&d.status==="failed")setOrder((v:any)=>({...v,status:"failed"}));}catch{}finally{checking.current=false}};const timer=window.setInterval(check,7000);void check();return()=>{stopped=true;window.clearInterval(timer)}},[order?.orderId,order?.status]);

 async function startLocal(){setError("");setNotice("");if(!user){window.location.href="https://numelixa.com/login?next="+encodeURIComponent("/wallet?amount="+encodeURIComponent(amount));return;}if(!user.verified_at){window.location.href="https://numelixa.com/verify-email";return;}if(!validAmount){setError("Enter an amount between "+money(minAmount)+" and "+money(maxAmount)+".");return;}if(!phone.trim()){setError("Enter the phone number linked to your mobile wallet.");return;}setBusy(true);try{const r=await fetch("/api/payments/sifalo/create",{method:"POST",headers:{"Content-Type":"application/json"},credentials:"include",body:JSON.stringify({amountUsd:Number(amount),method,phone})});const d=await r.json();if(!r.ok||!d.ok)throw new Error(d.error||"Unable to send the payment request.");setOrder({orderId:d.orderId,amountUsd:Number(amount),status:d.status||"pending",method});if(d.status==="paid"){setNotice("Payment confirmed — your wallet balance has been updated.");fetch("/api/me",{cache:"no-store",credentials:"include"}).then(r=>r.json()).then(me=>{if(me.user)setUser(me.user)}).catch(()=>{});}else if(d.status==="failed"){setError(d.message||"The payment was declined. Check your wallet and try again.");setOrder({orderId:d.orderId,amountUsd:Number(amount),status:"failed",method});}else setNotice("Payment request sent. Approve it on your phone, then keep this page open while we confirm it.");}catch(e){setError(e instanceof Error?e.message:"Unable to start payment.");}finally{setBusy(false)}}

 async function startCrypto(){setError("");setNotice("");if(!user){window.location.href="https://numelixa.com/login?next="+encodeURIComponent("/wallet?amount="+encodeURIComponent(amount));return;}if(!user.verified_at){window.location.href="/verify-email";return;}if(!validAmount){setError("Enter an amount between "+money(minAmount)+" and "+money(maxAmount)+".");return;}if(!network){setError("Choose a deposit network.");return;}setBusy(true);try{const r=await fetch("/api/payments/binance/create",{method:"POST",headers:{"Content-Type":"application/json"},credentials:"include",body:JSON.stringify({amountUsd:Number(amount),currency:asset,network})});const d=await r.json();if(!r.ok||!d.ok)throw new Error(d.error||"Unable to create crypto payment.");setDeposit(d);setDepositStatus("pending");}catch(e){setError(e instanceof Error?e.message:"Unable to start crypto payment.");}finally{setBusy(false)}}

 const methods=useMemo(()=>[
  {id:"card" as const,title:"Visa / Mastercard",detail:"Direct card processing awaits a supported card gateway",icon:"▰",disabled:true},
  {id:"waafi" as const,title:"Waafi · EVC · ZAAD · SAHAL",detail:"Enter your number, then approve the request on your phone",icon:"◉",disabled:false},
  {id:"edahab" as const,title:"eDahab",detail:"Use your registered eDahab number and confirm on your phone",icon:"◈",disabled:false},
  {id:"premier" as const,title:"Premier Wallet",detail:"USD wallet · approve using your Premier Wallet account",icon:"✦",disabled:false},
  {id:"crypto" as const,title:"Crypto",detail:"USDT, BNB and supported networks",icon:"₿",disabled:false}
 ],[]);

 return <div className="nx-checkout-root">
  <header className="nx-checkout-nav"><a className="nx-checkout-brand" href="https://numelixa.com/dashboard"><span className="nx-checkout-logo">N</span><span><b>Numelixa</b><small>Secure checkout</small></span></a><span className="nx-secure-label"><i/> ENCRYPTED CHECKOUT</span></header>
  <div className="nx-checkout-layout">
   <section className="nx-checkout-main">
    <div className="nx-checkout-kicker"><span>01</span> WALLET TOP-UP</div>
    <h1>Fund your wallet.<br/><em>Stay in Numelixa.</em></h1>
    <p className="nx-checkout-intro">Choose an amount and pay through our secure checkout. You will never be sent to a Sifalo website for mobile-wallet payments.</p>
    <section className="nx-amount-panel">
     <label htmlFor="nx-amount">Amount to add</label>
     <div className="nx-amount-input"><span>$</span><input id="nx-amount" inputMode="decimal" type="number" min={minAmount} max={maxAmount} step="0.01" value={amount} onChange={e=>{setAmount(e.target.value);setOrder(null);setDeposit(null);setError("");setNotice("");}}/><span>USD</span></div>
     <div className="nx-amount-presets">{[1,5,10,25,50].filter(x=>x>=minAmount&&x<=maxAmount).map(v=><button type="button" key={v} className={Number(amount)===v?"active":""} onClick={()=>{setAmount(v.toFixed(2));setError("");setNotice("");setOrder(null);setDeposit(null)}}>{money(v)}</button>)}</div>
     <div className="nx-amount-foot"><span>Wallet credit</span><strong>{money(amountNumber)}</strong></div>
     {!validAmount&&<small className="nx-validation">Enter an amount between {money(minAmount)} and {money(maxAmount)}.</small>}
    </section>

    <div className="nx-checkout-kicker nx-payment-kicker"><span>02</span> PAYMENT METHOD</div>
    <h2>How would you like to pay?</h2>
    {localOpen&&<div className="nx-method-group"><span className="nx-method-group-label">LOCAL PAYMENTS</span><div className="nx-payment-methods">{methods.filter(m=>m.id!=="crypto").map(m=><button type="button" key={m.id} disabled={m.disabled} className={"nx-payment-method "+(method===m.id?"selected":"")+(m.disabled?" disabled":"")} onClick={()=>{setMethod(m.id);setError("");setNotice("");}}><span className="nx-method-icon">{m.icon}</span><span className="nx-method-copy"><b>{m.title}</b><small>{m.detail}</small></span><span className="nx-method-check">{m.disabled?"Soon":method===m.id?"✓":"›"}</span></button>)}</div></div>}<div className="nx-method-group"><span className="nx-method-group-label">CRYPTOCURRENCY</span><div className="nx-payment-methods">{methods.filter(m=>m.id==="crypto").map(m=><button type="button" key={m.id} className={"nx-payment-method "+(method===m.id?"selected":"")} onClick={()=>{setMethod(m.id);setError("");setNotice("");}}><span className="nx-method-icon">{m.icon}</span><span className="nx-method-copy"><b>{m.title}</b><small>{m.detail}</small></span><span className="nx-method-check">{method===m.id?"✓":"›"}</span></button>)}</div></div>

    {method!=="crypto"&&method!=="card"&&localOpen&&<section className="nx-payment-form">
     <label htmlFor="nx-phone">Mobile wallet number</label>
     <input id="nx-phone" type="tel" autoComplete="tel" placeholder="+252 6X XXX XXXX" value={phone} onChange={e=>setPhone(e.target.value)} />
     <small>Use the number registered with {method==="waafi"?"Waafi, EVC Plus, ZAAD or SAHAL":method==="edahab"?"eDahab":"Premier Wallet"}. Confirm that the wallet can pay in USD.</small>
     <button type="button" className="nx-checkout-pay" disabled={busy||!validAmount} onClick={startLocal}>{busy?"Sending secure request…":"Request payment · "+money(amountNumber)} <span>→</span></button>
    </section>}

    {method==="crypto"&&<section className="nx-payment-form">
     {!assets.length?<p>Loading supported crypto assets…</p>:<><label htmlFor="nx-asset">Crypto asset</label><select id="nx-asset" value={asset} onChange={e=>{const v=e.target.value;setAsset(v);const a=assets.find(x=>x.coin===v);setNetwork(a?.networks?.find(n=>n.isDefault)?.network||a?.networks?.[0]?.network||"");setDeposit(null);}}>{assets.map(a=><option key={a.coin} value={a.coin}>{a.coin} · {a.name}</option>)}</select><label>Choose deposit network</label><div className="nx-network-choice-grid">{networks.map(n=><button type="button" key={n.network} className={"nx-network-choice "+(network===n.network?"selected":"")} onClick={()=>setNetwork(n.network)}><img src={networkLogo(n)} alt="" width="28" height="28" loading="lazy" onError={e=>{e.currentTarget.onerror=null;e.currentTarget.src="https://cdn.simpleicons.org/blockchaindotcom"}}/><span><b>{n.networkName}</b><small>{n.network}{n.isDefault?" · Recommended":""}</small></span><i>{network===n.network?"✓":"›"}</i></button>)}</div><button type="button" className="nx-checkout-pay" disabled={busy||!validAmount||!network} onClick={startCrypto}>{busy?"Preparing secure deposit…":"Continue with crypto · "+money(amountNumber)} <span>→</span></button></>}
    </section>}

    {error&&<div className="nx-checkout-error" role="alert">{error}</div>}
    {notice&&<div className={"nx-checkout-notice "+(order?.status==="paid"||depositStatus==="paid"?"success":"")} role="status">{notice}</div>}
    {order&&<section className="nx-payment-status"><span className="nx-status-pulse"/><div><b>{order.status==="paid"?"Payment complete":order.status==="failed"?"Payment declined":"Approve payment on your phone"}</b><p>{order.status==="paid"?"Your wallet has been credited.":order.status==="failed"?"No funds were added. You may try again.":"Check your phone and approve the payment request. This page checks the status automatically."}</p><small>Reference: {order.orderId}</small></div></section>}
    {deposit&&<section className="nx-crypto-deposit"><div className="nx-deposit-head"><div><span>CRYPTO DEPOSIT</span><h3>{deposit.amount} {deposit.currency}</h3></div><span className={"nx-deposit-status "+(depositStatus==="paid"?"paid":"")}>{depositStatus==="paid"?"CONFIRMED":"AWAITING DEPOSIT"}</span></div><p>Send the exact amount on the selected network. Your wallet is updated after the deposit is confirmed.</p><div className="nx-deposit-row"><small>Network</small><b>{deposit.networkName||deposit.network}</b></div><div className="nx-deposit-row"><small>Deposit address</small><b>{deposit.address}</b></div><button type="button" className="nx-copy-address" onClick={()=>navigator.clipboard.writeText(String(deposit.address||""))}>Copy address</button><div className="nx-deposit-row"><small>USD order value</small><b>{money(Number(deposit.baseAmount||amountNumber))}</b></div>{depositStatus==="paid"&&<p className="nx-deposit-success">Payment confirmed. Your wallet is updated.</p>}</section>}
   </section>

   <aside className="nx-checkout-aside">
    <div className="nx-order-card"><div className="nx-order-card-top"><span className="nx-order-orbit">N</span><span className="nx-live-tag"><i/> SECURE</span></div><span className="nx-order-label">NUMELIXA WALLET</span><h2>Top-up summary</h2><div className="nx-summary-line"><span>Current balance</span><b>{user?money(Number(user.coins||0)/rate):"—"}</b></div><div className="nx-summary-line"><span>Wallet top-up</span><b>{money(amountNumber)}</b></div><div className="nx-summary-line"><span>Processing fee</span><b>$0.00</b></div><div className="nx-summary-line total"><span>Total</span><strong>{money(amountNumber)}</strong></div><div className="nx-aside-note"><span>✓</span><p>Payments are matched to your account and verified server-side before your balance changes.</p></div></div>
    <div className="nx-checkout-trust"><div>⌁<span><b>Protected checkout</b><small>Your payment credentials stay with your payment provider.</small></span></div><div>↻<span><b>Live confirmation</b><small>Wallet status refreshes after approval.</small></span></div><div>◈<span><b>USD balance</b><small>Your wallet balance is shown in dollars.</small></span></div></div>
   </aside>
  </div>
  <footer className="nx-checkout-footer"><span>© 2026 Numelixa</span><span>Secure · Verified · USD</span><a href="https://numelixa.com/support">Need help?</a></footer>
 </div>;
}
