"use client";
import Link from "next/link";
import {useEffect,useState} from "react";
const money=(n:number)=>new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",minimumFractionDigits:2,maximumFractionDigits:2}).format(Number.isFinite(n)?n:0);
export default function DashboardWalletCard(){
 const [balance,setBalance]=useState<number|null>(null),[busy,setBusy]=useState(true),[failed,setFailed]=useState(false);
 useEffect(()=>{let live=true;fetch("/api/me",{cache:"no-store",credentials:"include"}).then(r=>r.json()).then(d=>{if(live&&d.user){const c=Number(d.user.coins||0);setBalance(c/(Number(d.pricing?.coinsPerUsd)||100));}else if(live)setFailed(true);}).catch(()=>{if(live)setFailed(true)}).finally(()=>{if(live)setBusy(false)});return()=>{live=false}},[]);
 return <section className="nx-dashboard-balance nx-dashboard-balance-v2">
  <div className="nx-dashboard-wallet-art" aria-hidden="true"><span className="nx-wallet-art-orbit"/><span className="nx-wallet-art-chip">NX</span></div>
  <div className="nx-dashboard-balance-copy"><span className="nx-dashboard-balance-label">NUMELIXA WALLET <i/> SECURE</span><strong>{busy?"—":failed?"Unavailable":balance===null?"$0.00":money(balance)}</strong><small>Available balance · USD wallet</small></div>
  <div className="nx-dashboard-wallet-actions"><Link href="/wallet" className="nx-dashboard-topup"><span>＋</span> Add funds <b>→</b></Link><Link href="/wallet" className="nx-dashboard-wallet-manage">Manage wallet</Link></div>
 </section>;
}
