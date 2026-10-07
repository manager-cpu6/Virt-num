"use client";
import {useEffect,useState} from "react";

type Sent={
 id:string;title:string;message:string;target:string;createdAt:string;
 sentCount:number;failureCount?:number;pushConfigured?:boolean
};

export default function AdminNotifications(){
 const[title,setTitle]=useState("");
 const[message,setMessage]=useState("");
 const[target,setTarget]=useState("all");
 const[users,setUsers]=useState<{id:string;name:string;email:string}[]>([]);
 const[history,setHistory]=useState<Sent[]>([]);
 const[deviceCount,setDeviceCount]=useState(0),[linkedDeviceCount,setLinkedDeviceCount]=useState(0),[unlinkedDeviceCount,setUnlinkedDeviceCount]=useState(0);
 const[serverPushConfigured,setServerPushConfigured]=useState(false);
 const[databaseConfigured,setDatabaseConfigured]=useState(true);
 const[backendError,setBackendError]=useState("");
 const[busy,setBusy]=useState(false);
 const[result,setResult]=useState("");

 async function load(){
  setBackendError("");
  try{
   const health=await fetch("/api/notifications/health",{cache:"no-store"}).then(r=>r.json()).catch(()=>null);
   if(health?.ok){
    setDatabaseConfigured(Boolean(health.databaseConfigured));
    setServerPushConfigured(Boolean(health.firebaseAdminConfigured));
   }

   const r=await fetch("/api/admin/notifications",{cache:"no-store"});
   const d=await r.json().catch(()=>null);
   if(d?.ok){
    setHistory(d.notifications||[]);
    setDeviceCount(Number(d.deviceCount||0));
    setLinkedDeviceCount(Number(d.linkedDeviceCount||0));
    setUnlinkedDeviceCount(Number(d.unlinkedDeviceCount||0));
    setServerPushConfigured(Boolean(d.serverPushConfigured));
   }else{
    setBackendError(d?.error||"Unable to load notification status.");
   }
  }catch{
   setBackendError("Unable to reach the notification backend.");
  }
 }

 useEffect(()=>{
  load();
  fetch("/api/admin/users",{cache:"no-store"})
   .then(r=>r.json())
   .then(d=>{if(d.ok)setUsers(d.users||[])})
   .catch(()=>{});
 },[]);

 async function testCurrentDevice(){
  setBusy(true);setResult("");
  try{
   const r=await fetch("/api/admin/notifications",{method:"POST",headers:{"Content-Type":"application/json"},credentials:"include",body:JSON.stringify({action:"test_current_device"})});
   const d=await r.json();
   setResult(d.ok?"✅ Test notification sent to this admin device.":"❌ "+(d.error||"Native push test failed."));
  }catch{setResult("❌ Unable to run the native push test.")}finally{setBusy(false)}
 }

 async function send(e:React.FormEvent){
  e.preventDefault();
  setBusy(true);
  setResult("");
  try{
   const r=await fetch("/api/admin/notifications",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    credentials:"include",
    body:JSON.stringify({title,message,target})
   });
   const d=await r.json();

   if(!d.ok){
    setResult("❌ "+(d.error||"Unable to send"));
    return;
   }

   if(Number(d.devices||0)===0){
    setResult(
     "⚠️ Saved for "+d.recipients+" users, but no app devices are registered. "+
     "Open the Numelixa Android app while logged in and allow notifications."
    );
   }else if(!d.pushConfigured){
    setResult(
     "⚠️ Saved for "+d.recipients+" users, but Firebase Push is not configured on the server. "+
     "Add FIREBASE_PROJECT_ID, FIREBASE_CLIENT_EMAIL and FIREBASE_PRIVATE_KEY in Vercel."
    );
   }else if(Number(d.failed||0)>0){
    setResult(
     "⚠️ Sent to "+d.sent+" devices, but "+d.failed+" devices failed."
    );
   }else{
    setResult("✅ Sent to "+d.sent+" app devices · saved for "+d.recipients+" users");
   }

   setTitle("");
   setMessage("");
   load();
  }finally{
   setBusy(false);
  }
 }

 return <div className="admin-notifications">
  <div className="notification-compose"><div className="notice"><span>🔔</span><p>Native push: <b>{serverPushConfigured?"Firebase ready":"Firebase credentials missing"}</b> · <b>{deviceCount}</b> registered · <b>{linkedDeviceCount}</b> linked · <b>{unlinkedDeviceCount}</b> unlinked</p></div>
   <button type="button" className="secondary-btn full" onClick={testCurrentDevice} disabled={busy}>🔔 Test this admin device</button>
   <span className="eyebrow">PUSH CENTER</span>
   <h2>Send a notification</h2>
   <p>Send a real native phone notification to every user or one specific user. Numelixa does not use an in-app notification inbox.</p>
   <form onSubmit={send} className="admin-form">
    <label>Audience
     <select value={target} onChange={e=>setTarget(e.target.value)}>
      <option value="all">All users</option>
      {users.map(u=><option key={u.id} value={"user:"+u.id}>{u.name||"Unnamed"} · {u.email}</option>)}
     </select>
    </label>
    <label>Title
     <input value={title} onChange={e=>setTitle(e.target.value)} maxLength={80} placeholder="e.g. New Numelixa update"/>
    </label>
    <label>Message
     <textarea value={message} onChange={e=>setMessage(e.target.value)} maxLength={500} rows={5} placeholder="Write the notification…"/>
    </label>
    <button className="primary-btn" disabled={busy||!title.trim()||!message.trim()}>
     {busy?"Sending…":"🔔 Send notification"}
    </button>
    {result&&<div className="success-box">{result}</div>}
   </form>
  </div>
  <Table title={"Recent notifications ("+history.length+")"}>
   {history.length
    ?history.map(x=><div className="admin-notification-history" key={x.id}>
      <div>
       <b>{x.title}</b>
       <p>{x.message}</p>
       <small>
        {new Date(x.createdAt).toLocaleString()} · {x.sentCount||0} push sent
        {Number(x.failureCount||0)>0?" · "+x.failureCount+" failed":""}
       </small>
      </div>
     </div>)
    :<div className="country-loading">No notifications sent yet.</div>}
  </Table>
 </div>;
}

function Table({title,children}:{title:string;children:React.ReactNode}){
 return <div className="admin-card"><h2>{title}</h2>{children}</div>;
}
