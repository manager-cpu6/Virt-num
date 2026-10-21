"use client";
import {useEffect,useState} from "react";
import Link from "next/link";
import {useRouter} from "next/navigation";
import {Capacitor} from "@capacitor/core";
import PhoneAuth from "@/components/PhoneAuth";
import GoogleSignIn from "@/components/GoogleSignIn";

function playSuccessTone(){
 try{
  const AudioContextClass=(window as any).AudioContext||(window as any).webkitAudioContext;
  if(!AudioContextClass)return;
  const ctx=new AudioContextClass();
  const play=(frequency:number,start:number,duration:number)=>{
   const osc=ctx.createOscillator(),gain=ctx.createGain();
   osc.type="sine";osc.frequency.value=frequency;
   gain.gain.setValueAtTime(0.0001,ctx.currentTime+start);
   gain.gain.exponentialRampToValueAtTime(0.12,ctx.currentTime+start+0.02);
   gain.gain.exponentialRampToValueAtTime(0.0001,ctx.currentTime+start+duration);
   osc.connect(gain);gain.connect(ctx.destination);osc.start(ctx.currentTime+start);osc.stop(ctx.currentTime+start+duration+0.02);
  };
  void ctx.resume();play(660,0,0.12);play(880,0.13,0.18);window.setTimeout(()=>void ctx.close(),500);
 }catch{}
}
export default function Login(){
 const[email,setEmail]=useState(""),[secret,setSecret]=useState(""),[error,setError]=useState(""),[loading,setLoading]=useState(false),[next,setNext]=useState(""),[approval,setApproval]=useState<any>(null),[emailCode,setEmailCode]=useState(""),[emailCodeSent,setEmailCodeSent]=useState(false),[emailCodeBusy,setEmailCodeBusy]=useState(false),[emailCodeMessage,setEmailCodeMessage]=useState(""),[method,setMethod]=useState<"email"|"phone">("email"),[phoneEnabled,setPhoneEnabled]=useState(false),[success,setSuccess]=useState(""),router=useRouter();
 useEffect(()=>{setNext(new URLSearchParams(window.location.search).get("next")||"")},[]);
 useEffect(()=>{let active=true;fetch("/api/auth/methods",{cache:"no-store"}).then(r=>r.json()).then(d=>{if(active){const enabled=d.phoneEnabled!==false;setPhoneEnabled(enabled);if(!enabled)setMethod("email")}}).catch(()=>{});return()=>{active=false}},[]);
 function finishLogin(message="You're signed in successfully."){
  setSuccess(message);playSuccessTone();window.dispatchEvent(new Event("numelixa-auth-ready"));
  window.setTimeout(()=>router.push(next&&next.startsWith("/")?next:(role==="support_admin"?"/admin/support":"/dashboard")),650);
 }
 async function go(){
  setError("");if(!email.trim()||!secret){setError("Enter your email and password.");return}setLoading(true);
  try{const d=await fetch("/api/auth/login",{method:"POST",headers:{"Content-Type":"application/json","X-Numelixa-Client":Capacitor.isNativePlatform()?"android-app":"browser"},credentials:"include",body:JSON.stringify({email,password:secret})}).then(x=>x.json());
   if(d.approvalRequired){setApproval(d);return}if(!d.ok){setError(d.error||"Login failed");return}const sessionResponse=await fetch("/api/me",{cache:"no-store",credentials:"include"});const sessionData=sessionResponse.ok?await sessionResponse.json().catch(()=>null):null;if(!sessionData?.user?.id){setError("Your password was accepted, but Numelixa could not save your login session. Please try again.");return}try{localStorage.setItem("numelixa:last-login-email",email.trim().toLowerCase())}catch{}finishLogin("You're signed in successfully.",sessionData?.user?.role||d.role||"user");
  }catch{setError("Unable to contact Numelixa. Please try again.")}finally{setLoading(false)}
 }
 useEffect(()=>{if(!approval?.approvalId)return;let stopped=false;const timer=window.setInterval(async()=>{try{const d=await fetch("/api/auth/login/approval?id="+encodeURIComponent(approval.approvalId),{cache:"no-store"}).then(x=>x.json());if(stopped)return;const a=d.approval;if(a?.status==="approved"){stopped=true;window.clearInterval(timer);const session=await fetch("/api/auth/login/approval",{method:"PUT",headers:{"Content-Type":"application/json"},credentials:"include",body:JSON.stringify({approvalId:approval.approvalId})}).then(x=>x.json());if(!session.ok){setError(session.error||"Approval succeeded, but the browser session could not be created.");setApproval(null);return}const me=await fetch("/api/me",{cache:"no-store",credentials:"include"});const meData=me.ok?await me.json().catch(()=>null):null;if(!meData?.user?.id){setError("Your login was approved, but the session could not be verified. Please sign in again.");setApproval(null);return}finishLogin("Login approved successfully.",meData?.user?.role||"user")}else if(a?.status==="denied"||a?.status==="expired"){stopped=true;window.clearInterval(timer);setApproval(null);setError(a.status==="expired"?"The approval request expired.":"Login was not approved on your Numelixa app.")}}catch{}},1800);return()=>{stopped=true;window.clearInterval(timer)}},[approval?.approvalId,next]);
 async function useEmailCode(action:"send"|"verify"){
  if(!approval?.approvalId)return;
  setEmailCodeBusy(true);setEmailCodeMessage("");setError("");
  try{const d=await fetch("/api/auth/login/approval/code",{method:"POST",headers:{"Content-Type":"application/json"},credentials:"include",body:JSON.stringify({approvalId:approval.approvalId,action,code:emailCode})}).then(r=>r.json());if(!d.ok)throw new Error(d.error||"Unable to verify this login.");if(action==="send")setEmailCodeSent(true);setEmailCodeMessage(d.message||"Done.");}
  catch(e){setEmailCodeMessage(e instanceof Error?e.message:"Unable to verify this login.")}
  finally{setEmailCodeBusy(false)}
 }
 if(approval)return <div className="auth-page auth-modern"><div className="auth-brand"><div className="brand-mark">N</div><span>NUMELIXA</span></div><div className="auth-intro"><span className="eyebrow">EXTRA SECURITY</span><h1>Approve your login</h1><p>Open Numelixa on your registered Android device and choose “Yes, it’s me” or “No, deny login”.</p></div><div className="form-card auth-form"><div className="security-approval-card"><b>New browser login</b><span>{approval.device||"Browser"} · {approval.city||"Location unavailable"}</span><small>Only approve if you started this sign-in.</small></div><div className="approval-waiting">Waiting for approval…</div><div style={{borderTop:"1px solid rgba(120,160,190,.2)",paddingTop:18,marginTop:8}}><b>Can’t access your registered device?</b><p style={{color:"var(--muted)",fontSize:13,lineHeight:1.65}}>Use a one-time code sent to the email address on your Numelixa account instead.</p>{!emailCodeSent?<button className="secondary-btn full" disabled={emailCodeBusy} onClick={()=>void useEmailCode("send")}>{emailCodeBusy?"Sending code…":"Send code to my account email"}</button>:<><label>Email verification code<input value={emailCode} onChange={e=>setEmailCode(e.target.value.replace(/\D/g,"").slice(0,6))} inputMode="numeric" autoComplete="one-time-code" placeholder="6-digit code"/></label><button className="primary-btn full" disabled={emailCodeBusy||emailCode.length!==6} onClick={()=>void useEmailCode("verify")}>{emailCodeBusy?"Verifying…":"Verify code and approve login"}</button></>}{emailCodeMessage&&<p role="status" style={{fontSize:13,color:emailCodeMessage.toLowerCase().includes("unable")||emailCodeMessage.toLowerCase().includes("incorrect")?"#ff9aab":"#00d9ff",lineHeight:1.5}}>{emailCodeMessage}</p>}</div><button className="secondary-btn full" style={{marginTop:12}} onClick={()=>{setApproval(null);setEmailCodeSent(false);setEmailCode("");setEmailCodeMessage("")}}>Cancel sign-in</button></div></div>;

 return <div className="auth-page auth-modern">
  <div className="auth-brand"><Link href="/" className="brand-mark">N</Link><span>NUMELIXA</span></div>
  <div className="auth-intro"><span className="eyebrow">WELCOME BACK</span><h1>Sign in to your workspace.</h1><p>Access your virtual numbers, live SMS, wallet and orders.</p></div>
  {phoneEnabled&&<div className="auth-method-switch"><button className={method==="email"?"active":""} onClick={()=>setMethod("email")}>Email & password</button><button className={method==="phone"?"active":""} onClick={()=>setMethod("phone")}>📱 Phone OTP</button></div>}
  {phoneEnabled&&method==="phone"?<PhoneAuth mode="login"/>:<div className="form-card auth-form">
   <label>Email<input value={email} onChange={x=>setEmail(x.target.value)} type="email" autoComplete="email" placeholder="you@example.com"/></label>
   <label>Password<input value={secret} onChange={x=>setSecret(x.target.value)} type="password" autoComplete="current-password" placeholder="Your password"/></label>
   {error&&<div className="error-box">{error}</div>}
   <button className="primary-btn full" onClick={go} disabled={loading}>{loading?"Signing in…":"Sign in →"}</button>
   <Link className="text-link" href="/forgot-password">Forgot password?</Link>
  </div>}
  <div className="google-signin-section" style={{marginTop:20,display:"flex",flexDirection:"column",alignItems:"center",gap:12,width:"100%"}}>
   <div style={{display:"flex",alignItems:"center",gap:12,color:"var(--muted,#7c8999)",fontSize:12,fontWeight:600}}><span style={{height:1,background:"currentColor",opacity:.25,flex:1}}/><span>OR</span><span style={{height:1,background:"currentColor",opacity:.25,flex:1}}/></div>
   <GoogleSignIn onSuccess={()=>finishLogin("Google sign-in successful.")}/>
  </div>
  <p className="auth-switch">New to Numelixa? <Link href="/signup">Create your account</Link></p>
  {success&&<div role="status" aria-live="polite" style={{position:"fixed",zIndex:9999,left:"50%",bottom:"calc(26px + env(safe-area-inset-bottom))",transform:"translateX(-50%)",width:"min(92vw,380px)",padding:"15px 18px",borderRadius:18,display:"flex",alignItems:"center",gap:12,background:"#102b24",border:"1px solid rgba(65,220,160,.42)",color:"#eafff4",boxShadow:"0 14px 40px rgba(0,0,0,.28)"}}><span style={{width:34,height:34,borderRadius:"50%",background:"#20b981",color:"#05251a",display:"grid",placeItems:"center",fontSize:22,fontWeight:900}}>✓</span><span style={{fontWeight:650,fontSize:14}}>{success}</span></div>}
 </div>;
}
