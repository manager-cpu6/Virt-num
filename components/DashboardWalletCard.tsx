"use client";
import Link from "next/link";
import {useEffect,useState} from "react";
const money=(n:number)=>new Intl.NumberFormat("en-US",{style:"currency",currency:"USD",minimumFractionDigits:2,maximumFractionDigits:2}).format(Number.isFinite(n)?n:0);
export default function DashboardWalletCard(){
 const [balance,setBalance]=useState<number|null>(null),[busy,setBusy]=useState(true);
 useEffect(()=>{let live=true;fetch("/api/me",{cache:"no-store"}).then(r=>r.json()).then(d=>{if(live&&d.user)setBalance(Number(d.user.coins||0)/(Number(d.pricing?.coinsPerUsd)||100));}).catch(()=>{}).finally(()=>{if(live)setBusy(false)});return()=>{live=false}},[]);
 return <section className="nx-dashboard-balance"><div className="nx-dashboard-balance-copy"><span className="nx-dashboard-balance-label">AVAILABLE USD BALANCE</span><strong>{busy?"—":balance===null?"Sign in":money(balance)}</strong><small>One clear balance for every number you purchase.</small></div><Link href="/wallet" className="nx-dashboard-topup"><span>＋</span> Add funds <b>→</b></Link></section>;
}
