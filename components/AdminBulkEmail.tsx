"use client";
import {useState} from "react";
type Sender="info"|"payment"|"welcome"|"noreply"|"team"|"system"|"notification";
const senders:{value:Sender;label:string;purpose:string}[]=[
 {value:"info",label:"info@numelixa.com",purpose:"General company updates"},
 {value:"noreply",label:"noreplay@numelixa.com",purpose:"Automated account messages"},
 {value:"team",label:"team@numelixa.com",purpose:"Support tickets and support replies"},
 {value:"payment",label:"payment@numelixa.com",purpose:"Payment confirmations and receipts"},
 {value:"welcome",label:"welcome@numelixa.com",purpose:"New account welcome messages"},
 {value:"system",label:"system@numelixa.com",purpose:"Automated service and account updates"},
 {value:"notification",label:"notification@numelixa.com",purpose:"User notifications and announcements"}
];
export default function AdminBulkEmail(){
 const [sender,setSender]=useState<Sender>("info"),[html,setHtml]=useState("<h1 style=\"color:#1769e8\">Hello from Numelixa</h1>\n<p>Write your announcement here.</p>"),[busy,setBusy]=useState(false),[testBusy,setTestBusy]=useState(false),[testNotice,setTestNotice]=useState(""),[testError,setTestError]=useState(""),[error,setError]=useState(""),[notice,setNotice]=useState(""),[progress,setProgress]=useState<{campaignId:string;total:number;sent:number;failed:number;remaining:number}|null>(null);
 async function send(){
  if(html.trim().length<20){setError("Add complete HTML email content.");return;}
  if(!window.confirm("Send this HTML email to every registered user with a valid email address? The message will be delivered in small batches."))return;
  setBusy(true);setError("");setNotice("");setProgress(null);
  try{
   const start=await fetch("/api/admin/email-campaign",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"create",sender,html})});
   const created=await start.json();if(!start.ok||!created.ok)throw new Error(created.error||"Unable to create email campaign.");
   let state={campaignId:created.campaignId,total:Number(created.total||0),sent:0,failed:0,remaining:Number(created.total||0)};
   setProgress(state);setNotice("Campaign created. Sending emails…");
   while(state.remaining>0){
    const response=await fetch("/api/admin/email-campaign",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"send",campaignId:state.campaignId})});
    const data=await response.json();if(!response.ok||!data.ok)throw new Error(data.error||"Email batch failed.");
    state={campaignId:state.campaignId,total:Number(data.total||state.total),sent:Number(data.sent||0),failed:Number(data.failed||0),remaining:Number(data.remaining||0)};
    setProgress(state);
   }
   setNotice("Campaign finished. "+state.sent+" emails sent; "+state.failed+" failed.");
  }catch(e){setError(e instanceof Error?e.message:"Unable to send campaign.");}
  finally{setBusy(false);}
 }

 async function testEmail(){
  setTestBusy(true);setTestError("");setTestNotice("");
  try{
   const r=await fetch("/api/admin/email-test",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({sender,html})});
   const d=await r.json();if(!r.ok||!d.ok)throw new Error(d.error||"Test email failed.");
   setTestNotice(d.message||"Test email accepted. Check the administrator inbox.");
  }catch(e){setTestError(e instanceof Error?e.message:"Test email failed.");}
  finally{setTestBusy(false);}
 }
 async function retryFailed(){
  if(!progress||progress.failed===0)return;
  setBusy(true);setError("");setNotice("Retrying failed deliveries…");
  try{
   let state=progress;
   const retry=await fetch("/api/admin/email-campaign",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"retry",campaignId:state.campaignId})});
   const d=await retry.json();if(!retry.ok||!d.ok)throw new Error(d.error||"Retry could not start.");
   state={...state,sent:Number(d.sent||0),failed:Number(d.failed||0),remaining:Number(d.remaining||0)};setProgress(state);
   while(state.remaining>0){
    const r=await fetch("/api/admin/email-campaign",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"send",campaignId:state.campaignId})});
    const x=await r.json();if(!r.ok||!x.ok)throw new Error(x.error||"Retry batch failed.");
    state={...state,sent:Number(x.sent||0),failed:Number(x.failed||0),remaining:Number(x.remaining||0)};setProgress(state);
   }
   setNotice("Retry finished. "+state.sent+" sent; "+state.failed+" still failed.");
  }catch(e){setError(e instanceof Error?e.message:"Retry failed.");}
  finally{setBusy(false);}
 }
 return <main style={{minHeight:"100vh",padding:"26px clamp(14px,3vw,34px) 70px",background:"radial-gradient(ellipse at 10% 0%,#102d58 0,transparent 38%),#050b18",color:"#eff6ff"}}>
  <div style={{maxWidth:1120,margin:"0 auto"}}>
   <a href="/admin" style={{color:"#80caff",fontSize:13,fontWeight:800,textDecoration:"none"}}>← Back to Admin</a>
   <header style={{margin:"22px 0 24px"}}><span style={{fontSize:10,letterSpacing:".18em",fontWeight:900,color:"#69d8e8"}}>NUMELIXA COMMUNICATIONS</span><h1 style={{fontSize:"clamp(30px,5vw,46px)",letterSpacing:"-.05em",margin:"8px 0"}}>Send email to users</h1><p style={{color:"#9bb1d0",maxWidth:680,lineHeight:1.65}}>Create a branded HTML email and send it to every registered user with a valid email address. Delivery runs in small batches so progress and failures can be tracked.</p></header>
   {error&&<div role="alert" style={{padding:14,borderRadius:12,background:"#401d2b",border:"1px solid #8b405a",color:"#ffd4df",marginBottom:14}}>{error}</div>}
   {notice&&<div role="status" style={{padding:14,borderRadius:12,background:"#0b302d",border:"1px solid #236b60",color:"#a8f5dc",marginBottom:14}}>{notice}</div>}
   <section className="nx-admin-email-grid" style={{display:"grid",gridTemplateColumns:"minmax(0,1.15fr) minmax(280px,.85fr)",gap:18,alignItems:"start"}}>
    <div style={{padding:22,border:"1px solid #233d61",borderRadius:22,background:"linear-gradient(145deg,#0c1c35,#081329)"}}>
     <label style={{display:"block",fontSize:12,fontWeight:800,marginBottom:8}}>Send from</label>
     <select value={sender} onChange={e=>setSender(e.target.value as Sender)} disabled={busy} style={{width:"100%",height:48,padding:"0 12px",borderRadius:12,border:"1px solid #2b466c",background:"#071329",color:"#eaf4ff"}}>
      {senders.map(s=><option key={s.value} value={s.value}>{s.label} — {s.purpose}</option>)}
     </select>
     <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",margin:"18px 0 8px"}}><label style={{fontSize:12,fontWeight:800}}>HTML email body</label><span style={{fontSize:10,color:"#8da8ca"}}>HTML supported</span></div>
     <textarea value={html} onChange={e=>setHtml(e.target.value)} disabled={busy} spellCheck={false} rows={17} style={{width:"100%",resize:"vertical",padding:14,borderRadius:12,border:"1px solid #2b466c",background:"#050e20",color:"#cce5ff",fontFamily:"ui-monospace,monospace",fontSize:12,lineHeight:1.6}}/>
     <div style={{display:"grid",gridTemplateColumns:"minmax(0,1fr) minmax(0,1fr)",gap:10,marginTop:16}}><button onClick={send} disabled={busy||testBusy} style={{minHeight:50,padding:"10px 12px",border:0,borderRadius:13,background:"linear-gradient(100deg,#236dff,#00b8d5)",color:"white",fontWeight:900,opacity:busy||testBusy ? 0.65 : 1}}>{busy?"Sending…":"✉ Send to all users"}</button><button onClick={testEmail} disabled={busy||testBusy} style={{minHeight:50,padding:"10px 12px",border:"1px solid #41658d",borderRadius:13,background:"#102846",color:"#d7eaff",fontWeight:850,opacity:busy||testBusy ? 0.65 : 1}}>{testBusy?"Testing…":"Test email"}</button></div>{testError&&<div role="alert" style={{marginTop:10,padding:12,borderRadius:10,background:"#401d2b",color:"#ffd4df",fontSize:12}}>{testError}</div>}{testNotice&&<div role="status" style={{marginTop:10,padding:12,borderRadius:10,background:"#0b302d",color:"#a8f5dc",fontSize:12}}>{testNotice}</div>}
     <p style={{fontSize:11,color:"#8199b9",lineHeight:1.6,marginBottom:0}}>A confirmation is required before sending. Keep this page open until all batches finish. Emails already marked sent are not sent again.</p>
    </div>
    <div style={{display:"grid",gap:14}}>
     <section style={{padding:20,border:"1px solid #233d61",borderRadius:22,background:"linear-gradient(145deg,#0c1c35,#081329)"}}>
      <span style={{fontSize:10,letterSpacing:".14em",color:"#7bd9e8",fontWeight:900}}>DELIVERY PROGRESS</span>
      {progress?<><div style={{fontSize:30,fontWeight:900,marginTop:10}}>{progress.sent+progress.failed} / {progress.total}</div><div style={{height:9,background:"#142744",borderRadius:99,overflow:"hidden",margin:"12px 0"}}><div style={{height:"100%",width:progress.total?((progress.sent+progress.failed)/progress.total*100)+"%":"0%",background:"linear-gradient(90deg,#287cff,#2ad6c1)"}}/></div><div style={{display:"flex",justifyContent:"space-between",fontSize:12,color:"#a8c0df"}}><span>Sent: {progress.sent}</span><span>Failed: {progress.failed}</span></div><p style={{fontSize:11,color:"#8ea8c8"}}>{progress.remaining} remaining</p>{!busy&&progress.failed>0&&<button onClick={retryFailed} style={{height:42,padding:"0 14px",borderRadius:11,border:"1px solid #496c9a",background:"#10294a",color:"#c6e6ff",fontWeight:800}}>Retry failed emails</button>}</>:<p style={{fontSize:12,color:"#91a9c8",lineHeight:1.6}}>Campaign totals and delivery results will appear here after sending begins.</p>}
     </section>
     <section style={{padding:20,border:"1px solid #233d61",borderRadius:22,background:"linear-gradient(145deg,#0c1c35,#081329)"}}>
      <span style={{fontSize:10,letterSpacing:".14em",color:"#7bd9e8",fontWeight:900}}>SENDER ROLES</span>
      {senders.map(s=><div key={s.value} style={{padding:"13px 0",borderBottom:"1px solid #1b3454"}}><b style={{fontSize:12}}>{s.label}</b><p style={{fontSize:11,color:"#91a9c8",margin:"4px 0 0"}}>{s.purpose}</p></div>)}
     </section>
     <section style={{padding:18,border:"1px solid #664d27",borderRadius:18,background:"#241d12",color:"#e9d6a9",fontSize:11,lineHeight:1.65}}>Bulk email must comply with your users’ communication preferences and applicable email laws. Do not include passwords, OTPs or sensitive account data in a campaign.</section>
    </div>
   </section>
  </div>
  <style jsx>{`@media(max-width:800px){.nx-admin-email-grid{grid-template-columns:1fr!important}}`}</style>
 </main>;
}
