"use client";
import {useEffect,useState} from "react";
export default function AdminAuthMethods(){
 const[phone,setPhone]=useState(true),[voice,setVoice]=useState(true),[loading,setLoading]=useState(true),[saving,setSaving]=useState(false),[msg,setMsg]=useState("");
 async function load(){setLoading(true);try{const d=await fetch("/api/admin/auth-methods",{cache:"no-store"}).then(r=>r.json());if(d.ok){setPhone(Boolean(d.phoneEnabled));setVoice(Boolean(d.voiceEnabled))}}finally{setLoading(false)}}
 useEffect(()=>{load()},[]);
 async function save(){setSaving(true);setMsg("");try{const d=await fetch("/api/admin/auth-methods",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({phoneEnabled:phone,voiceEnabled:voice})}).then(r=>r.json());setMsg(d.ok?"Authentication settings saved.":"Unable to save authentication settings.");}catch{setMsg("Unable to contact server.")}finally{setSaving(false)}}
 return <div className="admin-two-col">
  <div className="admin-card auth-control-card"><span className="eyebrow">LOGIN & SIGN UP</span><h2>Phone authentication</h2><p>Control whether users can create accounts and sign in using their mobile number and a one-time code.</p>
   <div className="auth-control-row"><div><b>Phone OTP</b><small>{phone?"Users can sign up and sign in with SMS verification.":"Phone authentication is closed."}</small></div><button className={phone?"auth-toggle on":"auth-toggle"} onClick={()=>setPhone(v=>!v)} disabled={loading}><span/></button></div>
   <div className="auth-control-row"><div><b>Voice OTP</b><small>{voice?"Users can choose a voice call to hear their verification code.":"Voice call verification is closed."}</small></div><button className={voice?"auth-toggle on":"auth-toggle"} onClick={()=>setVoice(v=>!v)} disabled={loading||!phone}><span/></button></div>
   <button className="primary-btn" onClick={save} disabled={saving||loading}>{saving?"Saving…":"Save authentication settings"}</button>{msg&&<div className="success-box">{msg}</div>}
  </div>
  <div className="admin-card"><span className="eyebrow">INFOBIP</span><h2>Provider setup</h2><div className="auth-provider-list">
   <div><b>SMS OTP</b><small>Uses the Infobip SMS API with its own server-side API key.</small><strong>INFOBIP_SMS_API_KEY · INFOBIP_BASE_URL · INFOBIP_SMS_SENDER</strong></div>
   <div><b>Voice OTP</b><small>Uses Infobip Advanced Voice TTS with a separate server-side API key.</small><strong>INFOBIP_VOICE_API_KEY · INFOBIP_BASE_URL · INFOBIP_VOICE_SENDER</strong></div>
  </div><p className="admin-help">SMS and Voice can use different Infobip API keys. Both keys stay server-side and are never sent to the browser.</p></div>
  <div className="admin-card"><span className="eyebrow">USER EXPERIENCE</span><h2>How it appears</h2><div className="auth-preview"><span>📱</span><div><b>Phone OTP</b><small>+251 ••••••••</small></div><em>6-digit code</em></div><div className="auth-preview"><span>☎</span><div><b>Voice call</b><small>“Your Numelixa verification code is…”</small></div><em>Optional</em></div></div>
  <div className="admin-card"><span className="eyebrow">IMPORTANT</span><h2>Delivery & security</h2><ul className="security-steps"><li>OTP codes are stored hashed, not as plain text.</li><li>Codes expire after 10 minutes.</li><li>New codes are limited to one request per 60 seconds per number.</li><li>SMS and Voice credentials stay server-side.</li><li>Closing Phone OTP immediately blocks new phone sign-in and sign-up attempts.</li></ul></div>
 </div>
}