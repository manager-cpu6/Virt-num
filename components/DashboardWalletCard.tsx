"use client";
import Link from "next/link";
import {useEffect,useState} from "react";
const money=(n:number)=>new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",minimumFractionDigits:2,maximumFractionDigits:2}).format(Number.isFinite(n)?n:0);
const integer=(n:number)=>new Intl.NumberFormat("en-US",{maximumFractionDigits:0}).format(Number.isFinite(n)?n:0);
export default function DashboardWalletCard(){
 const [balance,setBalance]=useState<number|null>(null),[coins,setCoins]=useState<number|null>(null),[busy,setBusy]=useState(true);
 useEffect(()=>{let live=true;fetch("/api/me",{cache:"no-store"}).then(r=>r.json()).then(d=>{if(live&&d.user){const c=Number(d.user.coins||0);setCoins(c);setBalance(c/(Number(d.pricing?.coinsPerUsd)||100));}}).catch(()=>{}).finally(()=>{if(live)setBusy(false)});return()=>{live=false}},[]);
 return <section className="nx-dashboard-balance nx-dashboard-balance-v2">
  <div className="nx-dashboard-balance-copy"><span className="nx-dashboard-balance-label">YOUR WALLET</span><strong>{busy?"—":balance===null?"Sign in":money(balance)}</strong><small>Available USD balance · Ready for your next number</small></div>
  <div className="nx-dashboard-coin-total"><span className="nx-dashboard-coin-symbol">✦</span><span><b>{busy?"—":coins===null?"—":integer(coins)}</b><small>NUMELIXA COINS</small></span></div>
  <Link href="/wallet" className="nx-dashboard-topup"><span>＋</span> Add funds <b>→</b></Link>
 </section>;
}
