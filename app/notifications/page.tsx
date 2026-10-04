"use client";
import {useEffect,useState} from "react";
import TopBar from "@/components/TopBar";
type N={id:string;title:string;message:string;createdAt:string;readAt?:string|null};
export default function NotificationsPage(){
 const[items,setItems]=useState<N[]>([]),[loading,setLoading]=useState(true);
 async function load(){try{const r=await fetch("/api/notifications",{cache:"no-store"});const d=await r.json();if(d.ok)setItems(d.notifications||[])}finally{setLoading(false)}}
 useEffect(()=>{load()},[]);
 async function read(id:string){await fetch("/api/notifications",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({id})});setItems(v=>v.map(x=>x.id===id?{...x,readAt:new Date().toISOString()}:x))}
 async function readAll(){await fetch("/api/notifications",{method:"POST"});setItems(v=>v.map(x=>({...x,readAt:new Date().toISOString()})))}
 return <div><TopBar title="Notifications" back/><section className="page-intro"><span className="eyebrow">NUMELIXA UPDATES</span><h1>Notifications</h1><p>Important account, order and app updates in one place.</p></section><div className="notification-actions"><button className="secondary-btn" onClick={readAll}>Mark all as read</button></div><div className="notification-list">{loading?<div className="country-loading">Loading notifications…</div>:!items.length?<div className="country-loading">No notifications yet.</div>:items.map(n=><button key={n.id} className={"notification-card "+(!n.readAt?"unread":"")} onClick={()=>read(n.id)}><span className="notification-icon">✦</span><div><b>{n.title}</b><p>{n.message}</p><small>{new Date(n.createdAt).toLocaleString()}</small></div><i>{!n.readAt?"●":"✓"}</i></button>)}</div></div>;
}
