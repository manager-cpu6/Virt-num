"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
import {useRouter} from "next/navigation";
import PhoneAuth from "@/components/PhoneAuth";
import GoogleSignIn from "@/components/GoogleSignIn";

function playSuccessTone(){
 try{
  const AudioContextClass=(window as any).AudioContext||(window as any).webkitAudioContext;
  if(!AudioContextClass)return;
  const ctx=new AudioContextClass();
  const play=(frequency:number,start:number,duration:number)=>{
   const osc=ctx.createOscillator(),gain=ctx.createGain();osc.type="sine";osc.frequency.value=frequency;
   gain.gain.setValueAtTime(0.0001,ctx.currentTime+start);gain.gain.exponentialRampToValueAtTime(0.12,ctx.currentTime+start+0.02);gain.gain.exponentialRampToValueAtTime(0.0001,ctx.currentTime+start+duration);
   osc.connect(gain);gain.connect(ctx.destination);osc.start(ctx.currentTime+start);osc.stop(ctx.currentTime+start+duration+0.02);
  };
  void ctx.resume();play(660,0,0.12);play(880,0.13,0.18);window.setTimeout(()=>void ctx.close(),500);
 }catch{}
}
export default function Signup(){
 const[n,setN]=useState(""),[m,setM]=useState(""),[p,setP]=useState(""),[e,setE]=useState(""),[loading,setLoading]=useState(false),[method,setMethod]=useState<"email"|"phone">("email"),[phoneEnabled,setPhoneEnabled]=useState(false),[success,setSuccess]=useState(""),router=useRouter();
 useEffect(()=>{let active=true;fetch("/api/auth/methods",{cache:"no-store"}).then(r=>r.json()).then(d=>{if(active){const enabled=d.phoneEnabled!==false;setPhoneEnabled(enabled);if(!enabled)setMethod("email")}}).catch(()=>{});return()=>{active=false}},[]);
 function finishSignup(message:string,destination:string){
  setSuccess(message);playSuccessTone();window.dispatchEvent(new Event("numelixa-auth-ready"));
  window.setTimeout(()=>router.push(destination),750);
 }
 async function go(){setE("");if(n.trim().length<2||!m.trim()||p.length<8){setE("Please enter your name, a valid email and a password of at least 8 characters.");return}setLoading(true);try{const d=await fetch("/api/auth/signup",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({name:n,email:m,password:p})}).then(x=>x.json());if(!d.ok){setE(d.error||"Signup failed");return}finishSignup("Account created. Check your email to verify it.","/verify-email")}catch{setE("Unable to contact Numelixa. Please try again.")}finally{setLoading(false)}}
 return <div className="auth-page auth-modern">
  <div className="auth-brand"><Link href="/" className="brand-mark">N</Link><span>NUMELIXA</span></div>
  <div className="auth-intro"><span className="eyebrow">CREATE YOUR ACCOUNT</span><h1>Start your Numelixa journey.</h1><p>Create an account to manage virtual numbers, SMS and your wallet.</p></div>
  {phoneEnabled&&<div className="auth-method-switch"><button className={method==="email"?"active":""} onClick={()=>setMethod("email")}>Email account</button><button className={method==="phone"?"active":""} onClick={()=>setMethod("phone")}>📱 Phone OTP</button></div>}
  {phoneEnabled&&method==="phone"?<PhoneAuth mode="signup"/>:<div className="form-card auth-form">
   <label>Full name<input value={n} onChange={x=>setN(x.target.value)} autoComplete="name" placeholder="Your name"/></label>
   <label>Email<input value={m} onChange={x=>setM(x.target.value)} type="email" autoComplete="email" placeholder="you@example.com"/></label>
   <label>Password<input value={p} onChange={x=>setP(x.target.value)} type="password" autoComplete="new-password" placeholder="At least 8 characters"/></label>
   {e&&<div className="error-box">{e}</div>}
   <button className="primary-btn full" onClick={go} disabled={loading}>{loading?"Creating your account…":"Create account →"}</button>
   <div className="auth-note">A verification code will be sent to your email.</div>
  </div>}
  <div className="google-signin-section" style={{marginTop:20,display:"flex",flexDirection:"column",alignItems:"center",gap:12,width:"100%"}}>
   <div style={{display:"flex",alignItems:"center",gap:12,color:"var(--muted,#7c8999)",fontSize:12,fontWeight:600}}><span style={{height:1,background:"currentColor",opacity:.25,flex:1}}/><span>OR</span><span style={{height:1,background:"currentColor",opacity:.25,flex:1}}/></div>
   <GoogleSignIn onSuccess={()=>finishSignup("Google verification successful.","/dashboard")}/>
  </div>
  <p className="auth-switch">Already have an account? <Link href="/login">Sign in</Link></p>
  {success&&<div role="status" aria-live="polite" style={{position:"fixed",zIndex:9999,left:"50%",bottom:"calc(26px + env(safe-area-inset-bottom))",transform:"translateX(-50%)",width:"min(92vw,380px)",padding:"15px 18px",borderRadius:18,display:"flex",alignItems:"center",gap:12,background:"#102b24",border:"1px solid rgba(65,220,160,.42)",color:"#eafff4",boxShadow:"0 14px 40px rgba(0,0,0,.28)"}}><span style={{width:34,height:34,borderRadius:"50%",background:"#20b981",color:"#05251a",display:"grid",placeItems:"center",fontSize:22,fontWeight:900}}>✓</span><span style={{fontWeight:650,fontSize:14}}>{success}</span></div>}
 </div>;
}
