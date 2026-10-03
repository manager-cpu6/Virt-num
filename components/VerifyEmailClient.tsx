"use client";
import {useEffect,useRef,useState} from "react";
import {useRouter} from "next/navigation";

export default function VerifyEmailClient(){
 const router=useRouter();
 const[code,setCode]=useState("");
 const[loading,setLoading]=useState(false);
 const[sending,setSending]=useState(true);
 const[message,setMessage]=useState("");
 const[error,setError]=useState("");
 const[verified,setVerified]=useState(false);
 const[secondsLeft,setSecondsLeft]=useState(0);
 const expiryRef=useRef(0);

 useEffect(()=>{
  loadCode();
 },[]);

 useEffect(()=>{
  const tick=()=>setSecondsLeft(Math.max(0,Math.ceil((expiryRef.current-Date.now())/1000)));
  tick();
  const id=setInterval(tick,1000);
  return()=>clearInterval(id);
 },[]);

 async function loadCode(resend=false){
  setSending(true);setError("");setMessage("");
  try{
   const r=await fetch("/api/auth/verification/start",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({resend})});
   const d=await r.json();
   if(!d.ok)throw new Error(d.error||"Unable to send verification code.");
   if(d.verified){setVerified(true);setMessage("Your email is already verified.");return;}
   if(d.expiresAt){
    expiryRef.current=new Date(d.expiresAt).getTime();
    setSecondsLeft(Math.max(0,Math.ceil((expiryRef.current-Date.now())/1000)));
   }
   setMessage(resend?"New code sent":"Code sent");
  }catch(e){setError(e instanceof Error?e.message:"Unable to send verification code.")}finally{setSending(false)}
 }

 async function confirm(){
  setLoading(true);setError("");setMessage("");
  try{
   if(secondsLeft<=0)throw new Error("This code has expired. Please request a new code.");
   const r=await fetch("/api/auth/verification/confirm",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({code})});
   const d=await r.json();
   if(!d.ok)throw new Error(d.error||"Verification failed.");
   setVerified(true);setMessage("Email verified successfully.");setTimeout(()=>router.push("/account"),700);
  }catch(e){setError(e instanceof Error?e.message:"Verification failed.")}finally{setLoading(false)}
 }

 const mins=Math.floor(secondsLeft/60),secs=String(secondsLeft%60).padStart(2,"0");
 if(verified)return <div className="form-card"><div className="success-box">✓ Email verified successfully.</div><button className="primary-btn full" onClick={()=>router.push("/account")}>Continue</button></div>;

 return <div className="form-card">
  <span className="eyebrow">EMAIL VERIFICATION</span>
  <h2>Verify your email</h2>
  <p>Enter the 6-digit code sent to your email. Verification is required before you can purchase a number.</p>
  <label>Verification code<input value={code} onChange={e=>setCode(e.target.value.replace(/\D/g,"").slice(0,6))} inputMode="numeric" autoComplete="one-time-code" placeholder="000000"/></label>
  <div className={"verify-countdown "+(secondsLeft<=60?"urgent":"")}><span>Code expires in</span><strong>{mins}:{secs}</strong></div>
  {message&&<div className="auth-note" style={{margin:"4px 0 12px",padding:"9px 11px",borderRadius:12,background:"rgba(98,229,207,.07)",border:"1px solid rgba(98,229,207,.12)",color:"#78b8b3",textAlign:"left"}}>✓ {message}</div>}
  {error&&<div className="error-box">{error}</div>}
  <button className="primary-btn full" style={{minHeight:46,marginTop:2}} onClick={confirm} disabled={loading||code.length!==6||secondsLeft<=0}>{loading?"Verifying…":"Verify email"}</button>
  <button className="secondary-btn full" style={{minHeight:42,marginTop:8}} onClick={()=>loadCode(true)} disabled={sending}>{sending?"Sending…":"Resend code"}</button>
 </div>;
}