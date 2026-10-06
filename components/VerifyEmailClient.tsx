"use client";
import {useEffect,useMemo,useRef,useState} from "react";
import {useRouter} from "next/navigation";

type Props={email?:string};

export default function VerifyEmailClient({email=""}:Props){
 const router=useRouter();
 const[digits,setDigits]=useState<string[]>(["","","","","",""]);
 const[loading,setLoading]=useState(false);
 const[sending,setSending]=useState(true);
 const[message,setMessage]=useState("");
 const[error,setError]=useState("");
 const[verified,setVerified]=useState(false);
 const[secondsLeft,setSecondsLeft]=useState(0);
 const[resendCooldown,setResendCooldown]=useState(0);
 const expiryRef=useRef(0);
 const inputRefs=useRef<Array<HTMLInputElement|null>>([]);
 const autoSubmitting=useRef(false);

 const code=digits.join("");
 const maskedEmail=useMemo(()=>{
  const value=String(email||"").trim();
  if(!value)return "your email address";
  const[local,domain]=value.split("@");
  if(!domain)return value;
  const visible=local.length<=2?local.slice(0,1):local.slice(0,2);
  return visible+"•••@"+domain;
 },[email]);

 useEffect(()=>{void loadCode()},[]);

 useEffect(()=>{
  const tick=()=>setSecondsLeft(Math.max(0,Math.ceil((expiryRef.current-Date.now())/1000)));
  tick();
  const id=window.setInterval(tick,1000);
  return()=>window.clearInterval(id);
 },[]);

 useEffect(()=>{
  if(resendCooldown<=0)return;
  const id=window.setInterval(()=>setResendCooldown(v=>Math.max(0,v-1)),1000);
  return()=>window.clearInterval(id);
 },[resendCooldown]);

 useEffect(()=>{
  if(code.length!==6||loading||verified||autoSubmitting.current)return;
  autoSubmitting.current=true;
  void confirm(code).finally(()=>{autoSubmitting.current=false});
 },[code,loading,verified]);

 async function loadCode(resend=false){
  setSending(true);setError("");setMessage("");
  try{
   const r=await fetch("/api/auth/verification/start",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    credentials:"include",
    body:JSON.stringify({resend})
   });
   const d=await r.json();
   if(!r.ok||!d.ok){
    if(d.retryAfter)setResendCooldown(Number(d.retryAfter)||60);
    throw new Error(d.error||"Unable to send the verification code.");
   }
   if(d.verified){setVerified(true);setMessage("Your email is already verified.");return;}
   if(d.expiresAt){
    expiryRef.current=new Date(d.expiresAt).getTime();
    setSecondsLeft(Math.max(0,Math.ceil((expiryRef.current-Date.now())/1000)));
   }
   setDigits(["","","","","",""]);
   setResendCooldown(resend?30:0);
   setMessage(d.reused?"Your existing code is still valid.":"A new code has been sent.");
   window.setTimeout(()=>inputRefs.current[0]?.focus(),80);
  }catch(e){
   setError(e instanceof Error?e.message:"Unable to send the verification code.");
  }finally{setSending(false)}
 }

 function changeDigit(index:number,value:string){
  const clean=value.replace(/\D/g,"").slice(-1);
  setDigits(current=>{
   const next=[...current];
   next[index]=clean;
   return next;
  });
  if(clean&&index<5)window.setTimeout(()=>inputRefs.current[index+1]?.focus(),0);
 }

 function keyDown(index:number,event:React.KeyboardEvent<HTMLInputElement>){
  if(event.key==="Backspace"&&!digits[index]&&index>0){
   event.preventDefault();
   setDigits(current=>{
    const next=[...current];
    next[index-1]="";
    return next;
   });
   inputRefs.current[index-1]?.focus();
  }
  if(event.key==="ArrowLeft"&&index>0)inputRefs.current[index-1]?.focus();
  if(event.key==="ArrowRight"&&index<5)inputRefs.current[index+1]?.focus();
 }

 function paste(event:React.ClipboardEvent<HTMLInputElement>){
  event.preventDefault();
  const pasted=event.clipboardData.getData("text").replace(/\D/g,"").slice(0,6);
  if(!pasted)return;
  const next=["","","","","",""];
  pasted.split("").forEach((v,i)=>{next[i]=v});
  setDigits(next);
  inputRefs.current[Math.min(pasted.length,5)]?.focus();
 }

 async function confirm(value=code){
  if(value.length!==6||secondsLeft<=0||loading||verified)return;
  setLoading(true);setError("");setMessage("");
  try{
   const r=await fetch("/api/auth/verification/confirm",{
    method:"POST",
    headers:{"Content-Type":"application/json"},
    credentials:"include",
    body:JSON.stringify({code:value})
   });
   const d=await r.json();
   if(!r.ok||!d.ok)throw new Error(d.error||"That code is not valid.");
   setVerified(true);
   setMessage("Email verified successfully.");
   window.setTimeout(()=>router.push("/account"),900);
  }catch(e){
   setError(e instanceof Error?e.message:"Verification failed.");
   setDigits(["","","","","",""]);
   window.setTimeout(()=>inputRefs.current[0]?.focus(),50);
  }finally{setLoading(false)}
 }

 const mins=Math.floor(secondsLeft/60);
 const secs=String(secondsLeft%60).padStart(2,"0");

 if(verified){
  return <div className="verify-modern-card verify-success-card">
   <div className="verify-success-icon">✓</div>
   <span className="eyebrow">EMAIL VERIFIED</span>
   <h2>You’re all set.</h2>
   <p>Your Numelixa account is now protected and ready to use.</p>
   <div className="verify-success-line"><span>✓</span> Email address confirmed</div>
   <div className="verify-success-line"><span>✓</span> Account security updated</div>
   <button className="primary-btn full" onClick={()=>router.push("/account")}>Continue to Numelixa <b>→</b></button>
  </div>;
 }

 return <div className="verify-modern-card">
  <div className="verify-mail-icon"><span>✉</span><i/></div>
  <span className="eyebrow">SECURE EMAIL VERIFICATION</span>
  <h2>Check your inbox</h2>
  <p className="verify-lead">We sent a 6-digit verification code to <strong>{maskedEmail}</strong>.</p>

  <div className="verify-code-header">
   <span>ENTER CODE</span>
   <small>{secondsLeft>0?"Expires in "+mins+":"+secs:"Code expired"}</small>
  </div>

  <div className="verify-code-inputs" onPaste={paste}>
   {digits.map((digit,index)=><input
    key={index}
    ref={el=>{inputRefs.current[index]=el}}
    value={digit}
    onChange={e=>changeDigit(index,e.target.value)}
    onKeyDown={e=>keyDown(index,e)}
    inputMode="numeric"
    autoComplete={index===0?"one-time-code":"off"}
    aria-label={"Verification digit "+(index+1)}
    maxLength={1}
    disabled={sending||loading||secondsLeft<=0}
   />)}
  </div>

  {loading&&<div className="verify-processing"><span className="verify-spinner"/> Verifying your code…</div>}
  {!loading&&message&&<div className="verify-message success">✓ {message}</div>}
  {error&&<div className="verify-message error">{error}</div>}

  <div className="verify-expiry">
   <span className={secondsLeft<=60?"urgent":""}>● {secondsLeft>0?"Code is active":"This code has expired"}</span>
   {secondsLeft>0&&<small>For your security, the code can only be used once.</small>}
  </div>

  <button className="secondary-btn full verify-resend" onClick={()=>loadCode(true)} disabled={sending||resendCooldown>0}>
   {sending?"Sending…":resendCooldown>0?"Resend available in "+resendCooldown+"s":"Didn’t receive it? Resend code"}
  </button>

  <p className="verify-security-note"><span>🔒</span> Never share your verification code with anyone, including Numelixa support.</p>
 </div>;
}
