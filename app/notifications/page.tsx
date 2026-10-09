"use client";
import Link from "next/link";
import {useCallback,useEffect,useState} from "react";
import TopBar from "@/components/TopBar";

type NotificationRow={id:string;title:string;message:string;createdAt:string;readAt?:string|null};
export default function NotificationsPage(){
 const[rows,setRows]=useState<NotificationRow[]>([]);
 const[loading,setLoading]=useState(true);
 const[error,setError]=useState("");
 const load=useCallback(async()=>{
  try{
   const r=await fetch("/api/notifications",{cache:"no-store",credentials:"include"});
   const d=await r.json();
   if(!r.ok||!d.ok)throw new Error("Sign in to view your notifications.");
   setRows(Array.isArray(d.notifications)?d.notifications:[]);
   setError("");
  }catch(e){setError(e instanceof Error?e.message:"Unable to load notifications.");}
  finally{setLoading(false);}
 },[]);
 useEffect(()=>{void load()},[load]);
 async function markRead(id?:string){
  try{
   const r=await fetch("/api/notifications",{method:"POST",credentials:"include",headers:{"Content-Type":"application/json"},body:JSON.stringify(id?{id}:{})});
   if(!r.ok)throw new Error();
   setRows(old=>old.map(n=>!id||n.id===id?{...n,readAt:new Date().toISOString()}:n));
   window.dispatchEvent(new Event("numelixa-notifications-updated"));
  }catch{setError("Unable to update notifications. Please try again.");}
 }
 return <div>
  <TopBar title="Notifications" back/>
  <main className="notifications-page">
   <div className="notifications-heading"><div><span className="eyebrow">YOUR ALERTS</span><h1>Notifications</h1><p>Order updates, SMS activity and account alerts.</p></div>
   {rows.some(n=>!n.readAt)&&<button className="notifications-mark-read" onClick={()=>void markRead()}>Mark all as read</button>}
   </div>
   {error&&<div className="helper-card"><b>{error}</b><Link href="/login?next=/notifications">Sign in</Link></div>}
   {loading?<div className="helper-card"><span>Loading notifications…</span></div>
   :rows.length?<div className="notification-list">{rows.map(n=><article key={n.id} className={"notification-item "+(!n.readAt?"unread":"")} onClick={()=>{if(!n.readAt)void markRead(n.id)}}>
     <div className="notification-item-icon" aria-hidden="true">♧</div><div><h3>{n.title||"Numelixa update"}</h3><p>{n.message}</p><time>{new Date(n.createdAt).toLocaleString()}</time></div>
    </article>)}</div>
   :!error?<div className="notification-empty"><div className="notification-item-icon" style={{margin:"0 auto"}}>♧</div><strong>You're all caught up</strong><p>New order, SMS and account notifications will appear here.</p></div>:null}
  </main>
 </div>
}
