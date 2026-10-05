"use client";
import Link from "next/link";
import {useEffect,useState} from "react";
import {Capacitor} from "@capacitor/core";

const apk="https://apk.numelixa.com/android";

export default function AndroidPage(){
 const[native,setNative]=useState(false);
 useEffect(()=>setNative(Capacitor.isNativePlatform()),[]);

 if(native){
  return <div className="mobile-app-page mobile-app-native-page">
   <div className="app-store-hero">
    <div className="app-brand-lockup"><span className="app-brand-n">N</span><span>Numelixa</span></div>
    <span className="eyebrow">NUMELIXA MOBILE</span>
    <h1>You're already using the app.</h1>
    <p>Fast navigation, live SMS, wallet access and native notifications are ready on this device.</p>
    <Link href="/" className="primary-btn full">Open Numelixa <span>→</span></Link>
   </div>
  </div>;
 }

 return <div className="mobile-app-page mobile-download-page">
  <div className="app-store-hero">
   <div className="app-brand-lockup">
    <span className="app-brand-n">N</span>
    <span>Numelixa</span>
   </div>
   <span className="eyebrow">NUMELIXA MOBILE</span>
   <h1>Fast. Simple. Powerful.</h1>
   <p>Get the native Numelixa experience with live numbers, SMS verification, wallet, orders and instant notifications.</p>

   <div className="app-download-buttons">
    <a href={apk} className="app-store-download android-download">
     <span className="store-icon">▣</span>
     <span><small>Download for</small><b>Android APK</b></span>
     <span className="store-arrow">↓</span>
    </a>
    <Link href="/ios" className="app-store-download ios-download">
     <span className="store-icon">●</span>
     <span><small>Coming soon for</small><b>iPhone / iOS</b></span>
     <span className="store-arrow">→</span>
    </Link>
   </div>

   <small className="app-package">Numelixa 2.3 · com.numelixa.app</small>
  </div>

  <div className="mobile-feature-grid">
   <div><b>⚡ Native speed</b><span>Designed for a phone-first experience.</span></div>
   <div><b>🔔 Instant alerts</b><span>Receive important SMS and account updates.</span></div>
   <div><b>◈ Wallet</b><span>See balance and top up without clutter.</span></div>
   <div><b>▣ Live SMS</b><span>Numbers, codes and orders stay together.</span></div>
  </div>

  <div className="mobile-version-card">
   <span>Latest Android build</span>
   <strong>Numelixa 2.3</strong>
   <small>Tap Android APK above to download the latest Numelixa build.</small>
  </div>
 </div>;
}
