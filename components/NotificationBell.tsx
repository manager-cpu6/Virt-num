"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
export default function NotificationBell(){
 const[unread,setUnread]=useState(0);
 async function load(){try{const r=await fetch("/api/notifications",{cache:"no-store"});const d=await r.json();if(d.ok)setUnread(Number(d.unread||0))}catch{}}
 useEffect(()=>{load();const id=setInterval(load,30000);window.addEventListener("numelixa-notification",load);return()=>{clearInterval(id);window.removeEventListener("numelixa-notification",load)}},[]);
 return <Link href="/notifications" className="notification-bell" aria-label="Notifications"><span>♢</span>{unread>0&&<b>{unread>99?"99+":unread}</b>}</Link>;
}
