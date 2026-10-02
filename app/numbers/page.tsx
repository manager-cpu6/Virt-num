"use client";
import Link from "next/link";
import TopBar from "@/components/TopBar";
import {useEffect,useState} from "react";
export default function Numbers(){
 const[o,setO]=useState<any[]>([]),[e,setE]=useState(""),[loaded,setLoaded]=useState(false);
 useEffect(()=>{fetch("/api/my-orders").then(r=>r.json()).then(d=>{if(d.ok)setO(d.orders||[]);else setE(d.error||"Sign in required");setLoaded(true)})},[]);
 return <div><TopBar title="My numbers"/><div className="page-intro"><span className="eyebrow">YOUR ORDERS</span><h1>My numbers</h1><p>Numbers you ordered from the live provider.</p></div>{loaded&&e?<div className="auth-page"><div className="form-card"><h2>Sign in required</h2><p>Sign in to see your purchased numbers and SMS codes.</p><Link className="primary-btn full" href="/login">Sign in</Link><Link className="secondary-btn full" href="/signup">Create account</Link></div></div>:<div className="list-card">{o.length?o.map(x=><div className="number-row" key={x.id}><span className="number-icon">☎</span><span className="number-main"><b>{x.phone_number||"Pending"}</b><small>{x.service} · {x.country}</small></span><span className={x.status==="received"?"status active":"status"}>{x.status}</span></div>):<div className="helper-card"><b>No orders yet</b><span>Your purchased numbers will appear here.</span></div>}</div>}</div>;
}