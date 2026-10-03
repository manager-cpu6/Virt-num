"use client";
import Link from "next/link";
import TopBar from "@/components/TopBar";
import {useEffect,useMemo,useState} from "react";

type Order={
  id:string;
  status:string;
  phone_number?:string|null;
  service?:string|null;
  country?:string|null;
  code?:string|null;
};

type Groups={
  active:Order[];
  received:Order[];
  cancelled:Order[];
};

export default function Numbers(){
  const [o,setO]=useState<Order[]>([]);
  const [e,setE]=useState("");
  const [loaded,setLoaded]=useState(false);
  const [tab,setTab]=useState<keyof Groups>("active");

  useEffect(()=>{
    fetch("/api/my-orders")
      .then(r=>r.json())
      .then(d=>{
        if(d.ok)setO((d.orders||[]) as Order[]);
        else setE(d.error||"Sign in required");
        setLoaded(true);
      })
      .catch(()=>{setE("Unable to load your numbers");setLoaded(true)});
  },[]);

  const groups=useMemo<Groups>(()=>({
    active:o.filter((x:Order)=>x.status==="waiting"),
    received:o.filter((x:Order)=>x.status==="received"),
    cancelled:o.filter((x:Order)=>["cancelled","refunded"].includes(x.status))
  }),[o]);

  const rows=groups[tab]||[];

  return <div>
    <TopBar title="My numbers"/>
    <div className="page-intro">
      <span className="eyebrow">NUMBER VAULT</span>
      <h1>My numbers</h1>
      <p>Track active numbers, received OTPs, and refunded orders.</p>
    </div>
    {loaded&&e?
      <div className="auth-page">
        <div className="form-card">
          <h2>Sign in required</h2>
          <p>Sign in to see your purchased numbers and SMS codes.</p>
          <Link className="primary-btn full" href="/login">Sign in</Link>
          <Link className="secondary-btn full" href="/signup">Create account</Link>
        </div>
      </div>
    :
      <>
        <div className="admin-tabs">
          <button className={tab==="active"?"tab active":"tab"} onClick={()=>setTab("active")}>Active {groups.active.length}</button>
          <button className={tab==="received"?"tab active":"tab"} onClick={()=>setTab("received")}>Received {groups.received.length}</button>
          <button className={tab==="cancelled"?"tab active":"tab"} onClick={()=>setTab("cancelled")}>Cancelled {groups.cancelled.length}</button>
        </div>
        <div className="list-card">
          {rows.length?
            rows.map((x:Order)=>
              <Link href={x.status==="waiting"?"/get-code/"+x.id:"#"} className="number-row" key={x.id}>
                <span className="number-icon">☎</span>
                <span className="number-main">
                  <b>{x.phone_number||"Pending"}</b>
                  <small>{x.service||"Service"} · {x.country||"Country"}{x.code?" · OTP "+x.code:""}</small>
                </span>
                <span className={x.status==="received"?"status active":"status"}>{x.status}</span>
              </Link>
            )
          :
            <div className="helper-card">
              <b>No numbers here</b>
              <span>Your {tab} numbers will appear in this section.</span>
            </div>
          }
        </div>
      </>
    }
  </div>;
}
