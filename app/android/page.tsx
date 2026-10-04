"use client";
import Link from "next/link";
import {useEffect,useState} from "react";
import {Capacitor} from "@capacitor/core";
const apk="https://github.com/manager-cpu6/Virt-num/releases/download/android-latest/Numelixa.apk";
export default function AndroidPage(){
 const[native,setNative]=useState(false);useEffect(()=>setNative(Capacitor.isNativePlatform()),[]);
 if(native)return <div className="mobile-app-page"><div className="app-store-hero"><span className="eyebrow">NUMELIXA MOBILE</span><h1>You're already using the Android app.</h1><p>Notifications, faster navigation and mobile-first controls are available here.</p><Link href="/" className="primary-btn full">Open Numelixa</Link></div></div>;
 return <div className="mobile-app-page"><div className="app-store-hero"><div className="app-store-icon">N</div><span className="eyebrow">NUMELIXA FOR ANDROID</span><h1>Numbers built for your phone.</h1><p>A focused Android experience with live SMS, wallet, orders, notifications and faster mobile navigation.</p><a href={apk} className="primary-btn full">Download Android APK <span>↓</span></a><small>Package: com.numelixa.app</small></div><div className="mobile-feature-grid"><div><b>⚡ Faster</b><span>Optimized mobile navigation</span></div><div><b>🔔 Notifications</b><span>Important updates from Numelixa</span></div><div><b>◈ Wallet</b><span>Balance and top-up at a glance</span></div><div><b>▣ Live SMS</b><span>Orders and verification in one place</span></div></div><div className="mobile-version-card"><span>Current Android build</span><strong>Numelixa 2.3</strong><small>Updates keep the same app identity.</small></div><Link href="/ios" className="mobile-other-link">Looking for iPhone? View iOS options →</Link></div>;
}
