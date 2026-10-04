"use client";
import Link from "next/link";
import {useEffect,useState} from "react";
import {Capacitor} from "@capacitor/core";
export default function IOSPage(){
 const[native,setNative]=useState(false);useEffect(()=>setNative(Capacitor.isNativePlatform()),[]);
 return <div className="mobile-app-page"><div className="app-store-hero"><div className="app-store-icon ios"></div><span className="eyebrow">NUMELIXA FOR IOS</span><h1>Numelixa on iPhone.</h1><p>The iPhone version is prepared as a native mobile experience with the same account, wallet, orders and notification system.</p>{native?<Link href="/" className="primary-btn full">Open Numelixa</Link>:<div className="store-coming"> App Store <b>Coming soon</b><small>We’ll publish the iOS build here when the App Store release is ready.</small></div>}</div><div className="mobile-feature-grid"><div><b> Native iPhone</b><span>Mobile-first interface</span></div><div><b>🔔 Push alerts</b><span>Order and account updates</span></div><div><b>◈ Wallet</b><span>Secure account balance</span></div><div><b>▣ Live SMS</b><span>Verification status on the go</span></div></div><Link href="/android" className="mobile-other-link">Need Android? Download the APK →</Link></div>;
}
