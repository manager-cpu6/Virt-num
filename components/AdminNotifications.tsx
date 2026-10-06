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
 const[deviceCount,setDeviceCount]=useState(0);
 const[claimedDeviceCount,setClaimedDeviceCount]=useState(0);
 const[verifiedGmailDeviceCount,setVerifiedGmailDeviceCount]=useState(0);
 const[serverPushConfigured,setServerPushConfigured]=useState(false);
 const[busy,setBusy]=useState(false),[testBusy,setTestBusy]=useState(false);
 const[result,setResult]=useState("");

 async function load(){
  try{
   const r=await fetch("/api/admin/notifications",{cache:"no-store"});
   const d=await r.json();
   if(d.ok){
 setHistory(d.notifications||[]);
 setDeviceCount(Number(d.deviceCount||0));
 setClaimedDeviceCount(Number(d.claimedDeviceCount||0));
 setVerifiedGmailDeviceCount(Number(d.verifiedGmailDeviceCount||0));
  setServerPushConfigured(Boolean(d.serverPushConfigured));
}
  }catch{}
 }

 useEffect(()=>{
  load();
  fetch("/api/admin/users",{cache:"no-store"})
   .then(r=>r.json())
   .then(d=>{if(d.ok)setUsers(d.users||[])})
   .catch(()=>{});
 },[]);

 async function testCurrentDevice(){
  setTestBusy(true);setResult("");
  try{
   const r=await fetch("/api/admin/notifications",{method:"POST",headers:{"Content-Type":"application/json"},credentials:"include",body:JSON.stringify({action:"test_current_device"})});
   const d=await r.json();
   if(!d.ok){setResult("❌ "+(d.error||"Push test failed."));return}
   setResult(Number(d.sent)>0?"✅ Firebase test notification sent to this device.":"❌ Firebase did not accept the device notification."+((d.errors||[])[0]?.message?" "+(d.errors||[])[0].message:""));
  }catch{setResult("❌ Unable to run the Firebase device test.");}
  finally{setTestBusy(false);}
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
     "⚠️ Sent to "+d.sent+" devices, but "+d.failed+" devices failed."+
     (d.errors?.[0]?.message?" FCM: "+d.errors[0].message:" Please reopen the latest Numelixa app so its FCM token can be registered again.")
    );
   }else{
    setResult("✅ Native push sent to "+d.sent+" devices · saved for "+d.recipients+" users");
   }

   setTitle("");
   setMessage("");
   load();
  }finally{
   setBusy(false);
  }
 }

 return <div className="admin-notifications">
  <div className="notification-compose"><div className="notice"><span>🔔</span><p>Native push: <b>{serverPushConfigured?"Firebase ready":"Firebase server credentials missing"}</b> · <b>{deviceCount}</b> registered device{deviceCount===1?"":"s"} · <b>{claimedDeviceCount}</b> linked · <b>{deviceCount-claimedDeviceCount}</b> unlinked.</p></div>
   <div className="admin-grid admin-grid-wide" style={{marginBottom:16}}>
    <div className="metric"><span>Registered devices</span><strong>{deviceCount}</strong><small>FCM tokens</small></div>
    <div className="metric"><span>Linked devices</span><strong>{claimedDeviceCount}</strong><small>ready for user push</small></div>
    <div className="metric"><span>Unlinked devices</span><strong>{Math.max(0,deviceCount-claimedDeviceCount)}</strong><small>need app login</small></div>
    <div className="metric"><span>Gmail app devices</span><strong>{verifiedGmailDeviceCount}</strong><small>verified Gmail accounts</small></div>
   </div>
   <div className="admin-card" style={{marginBottom:16}}><h2>Native notification diagnostics</h2><p className="admin-help">Push notifications are sent only to registered Numelixa Android devices. Email is not used as a substitute for app push.</p><div style={{display:"flex",gap:10,flexWrap:"wrap"}}><button className="secondary-btn" disabled={testBusy} onClick={testCurrentDevice}>{testBusy?"Testing…":"🔔 Test this admin device"}</button> </div></div>
   <span className="eyebrow">PUSH CENTER</span>
   <h2>Send a notification</h2>
   <p>Send a real native Firebase notification to every registered app device, Gmail users, non-Gmail users, or one specific user. The message is also saved in the Numelixa notification inbox.</p>
   <form onSubmit={send} className="admin-form">
    <label>Audience
     <select value={target} onChange={e=>setTarget(e.target.value)}>
      <option value="all">All users — Gmail + non-Gmail</option><option value="gmail">Gmail users only</option><option value="non_gmail">Non-Gmail users only</option>
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
