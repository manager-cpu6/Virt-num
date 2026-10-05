"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
import {Capacitor} from "@capacitor/core";
export default function MobileAppDownloadCTA(){
 const[native,setNative]=useState(true);
 useEffect(()=>setNative(Capacitor.isNativePlatform()),[]);
 if(native)return null;
 return <section className="app-download-cta"><div><span className="eyebrow">NUMELIXA MOBILE</span><h2>Get the Numelixa app</h2><p>Android and iPhone versions with a faster mobile experience, notifications and app-only features.</p></div><Link href="/mobile-apps" className="app-download-cta-btn">View mobile apps <span>→</span></Link></section>;
}
