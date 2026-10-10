"use client";
import {useEffect,useState} from "react";import Link from "next/link";import {useRouter} from "next/navigation";
type Mode="login"|"signup";type Delivery="sms"|"voice";
export default function PhoneAuth({mode,termsAccepted=false}:{mode:Mode;termsAccepted?:boolean}){
 const[phone,setPhone]=useState(""),[name,setName]=useState(""),[code,setCode]=useState(""),[step,setStep]=useState<"phone"|"otp">("phone"),[delivery,setDelivery]=useState<Delivery>("sms"),[voiceEnabled,setVoiceEnabled]=useState(true),[loading,setLoading]=useState(false),[error,setError]=useState(""),[expires,setExpires]=useState(0),router=useRouter();
 useEffect(()=>{fetch("/api/auth/methods",{cache:"no-store"}).then(r=>r.json()).then(d=>setVoiceEnabled(Boolean(d.voiceEnabled))).catch(()=>{})},[]);
 useEffect(()=>{if(!expires)return;const t=setInterval(()=>setExpires(x=>Math.max(0,x-1)),1000);return()=>clearInterval(t)},[expires]);
 async function request(){
  setError("");const clean=phone.replace(/[\s()-]/g,"");
  if(mode==="signup"&&name.trim().length<2){setError("Enter your name.");return}
  if(!/^\+?[1-9]\d{7,14}$/.test(clean)){setError("Enter your phone in international format, e.g. +251908976100.");return}
  setLoading(true);try{const r=await fetch("/api/auth/phone/request",{method:delivery==="voice"?"PUT":"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({phone:clean,name,purpose:mode,termsAccepted,termsVersion:"2026-10-10"})});const d=await r.json();if(!d.ok){setError(d.error||"Unable to send code.");return}setStep("otp");setExpires(600)}catch{setError("Unable to contact Numelixa.")}finally{setLoading(false)}
 }
 async function verify(){
  setError("");if(!/^\d{6}$/.test(code)){setError("Enter the 6-digit code.");return}setLoading(true);try{const clean=phone.replace(/[\s()-]/g,"").replace(/^00/,"+");const d=await fetch("/api/auth/phone/verify",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({phone:clean,name,code,termsAccepted,termsVersion:"2026-10-10"})}).then(r=>r.json());if(!d.ok){setError(d.error||"Verification failed.");return}window.dispatchEvent(new Event("numelixa-auth-ready"));router.push("/dashboard")}catch{setError("Unable to contact Numelixa.")}finally{setLoading(false)}
 }
 return <div className="phone-auth-card">
 {step==="phone"?<><div className="phone-auth-head"><span>📱</span><div><b>{mode==="login"?"Sign in with phone":"Create with phone"}</b><small>We'll send a one-time verification code.</small></div></div>
 {mode==="signup"&&<label>Your name<input value={name} onChange={e=>setName(e.target.value)} placeholder="Your name" autoComplete="name"/></label>}
 <label>Phone number<input value={phone} onChange={e=>setPhone(e.target.value)} placeholder="+251 90 897 6100" inputMode="tel" autoComplete="tel"/></label>
 <div className="phone-delivery-tabs"><button type="button" className={delivery==="sms"?"active":""} onClick={()=>setDelivery("sms")}>💬 SMS</button>{voiceEnabled&&<button type="button" className={delivery==="voice"?"active":""} onClick={()=>setDelivery("voice")}>☎ Voice call</button>}</div>
 {error&&<div className="error-box">{error}</div>}<button className="primary-btn full" onClick={request} disabled={loading}>{loading?"Sending code…":delivery==="voice"?"Call me with a code":"Send SMS code"}</button>
 </>:<><div className="phone-auth-head"><span>🔐</span><div><b>Enter your code</b><small>Sent to {phone}</small></div></div><label>6-digit verification code<input value={code} onChange={e=>setCode(e.target.value.replace(/\D/g,"").slice(0,6))} inputMode="numeric" autoComplete="one-time-code" placeholder="000000"/></label>{error&&<div className="error-box">{error}</div>}<div className="phone-otp-timer">{expires?"Code expires in "+Math.floor(expires/60)+":"+String(expires%60).padStart(2,"0"):"Code expired"}</div><button className="primary-btn full" onClick={verify} disabled={loading||code.length!==6}>{loading?"Verifying…":"Verify & continue →"}</button><button className="secondary-btn full" onClick={()=>{setStep("phone");setCode("");setError("")}}>Change number</button></>}
 <p className="auth-switch">{mode==="login"?<>New to Numelixa? <Link href="/signup">Create account</Link></>:<>Already have an account? <Link href="/login">Sign in</Link></>}</p>
 </div>
}
