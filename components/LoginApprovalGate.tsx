"use client";
import {useEffect,useState} from "react";
export default function LoginApprovalGate(){
 const[request,setRequest]=useState<any>(null),[busy,setBusy]=useState(false);
 useEffect(()=>{
  const consume=(d:any)=>{
   if(d?.type==="login_approval"&&d.approvalId){
    setRequest(d);
    try{localStorage.setItem("numelixa_pending_login_approval",JSON.stringify(d));}catch{}
   }
  };
  try{
   const raw=localStorage.getItem("numelixa_pending_login_approval");
   if(raw)consume(JSON.parse(raw));
  }catch{}
  try{
   const id=new URLSearchParams(window.location.search).get("approvalId");
   if(id)consume({type:"login_approval",approvalId:id});
  }catch{}
  const handler=(event:any)=>{
   const d=event?.detail||{};
   consume(d);
  };
  window.addEventListener("numelixa-login-approval",handler as EventListener);
  return()=>window.removeEventListener("numelixa-login-approval",handler as EventListener);
 },[]);
 if(!request)return null;
 const approve=async(value:boolean)=>{
  setBusy(true);
  try{
   const r=await fetch("/api/auth/login/approval",{method:"POST",headers:{"Content-Type":"application/json"},credentials:"include",body:JSON.stringify({approvalId:request.approvalId,approve:value})});
   const d=await r.json();
   if(d.ok){setRequest(null);try{localStorage.removeItem("numelixa_pending_login_approval")}catch{};return}
   alert(d.error||"This login request is no longer available.");
   setRequest(null);try{localStorage.removeItem("numelixa_pending_login_approval")}catch{};
  }catch{alert("Unable to respond to the login request. Please try again.");}
  finally{setBusy(false)}
 };
 return <div className="login-approval-overlay" role="dialog" aria-modal="true">
  <section className="login-approval-card">
   <div className="login-approval-icon">N</div>
   <span className="eyebrow">ACCOUNT SECURITY</span>
   <h2>Is this you?</h2>
   <p>A browser is trying to sign in to your Numelixa account.</p>
   <div className="login-approval-details">
    <div><span>DEVICE</span><b>{request.device||"Browser"}</b></div>
    <div><span>BROWSER</span><b>{request.browser||"Browser"}</b></div>
    <div><span>LOCATION</span><b>{request.city||"Location unavailable"}{request.country?", "+request.country:""}</b></div>
   </div>
   <div className="login-approval-actions">
    <button className="primary-btn full" disabled={busy} onClick={()=>approve(true)}>Yes, it's me <span>✓</span></button>
    <button className="secondary-btn full" disabled={busy} onClick={()=>approve(false)}>No, deny login <span>×</span></button>
   </div>
   <small>Only approve a login you recognize. If you do not recognize it, deny it immediately.</small>
  </section>
 </div>;
}
