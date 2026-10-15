"use client";
import {useEffect,useRef,useState} from "react";
declare global{interface Window{google?:any}}
export default function NativeGoogleBrowserPage(){
 const host=useRef<HTMLDivElement|null>(null);
 const [clientId,setClientId]=useState("");
 const [error,setError]=useState("");
 const [loading,setLoading]=useState(false);
 const [ready,setReady]=useState(false);
 useEffect(()=>{
  let active=true;
  fetch("/api/auth/google/config",{cache:"no-store"}).then(async r=>{const d=await r.json();if(!r.ok)throw new Error(d.error||"Google sign-in is unavailable.");return String(d.clientId||"").trim()}).then(id=>{if(active){if(!id)throw new Error("Google sign-in is not configured.");setClientId(id)}}).catch(e=>{if(active)setError(e instanceof Error?e.message:"Unable to load Google sign-in.")});
  return()=>{active=false};
 },[]);
 useEffect(()=>{
  if(!clientId)return;
  let active=true;
  const render=()=>{
   if(!active||!host.current||!window.google?.accounts?.id)return;
   host.current.innerHTML="";
   window.google.accounts.id.initialize({client_id:clientId,auto_select:false,cancel_on_tap_outside:false,callback:async(response:any)=>{
    if(!active)return;
    const credential=String(response?.credential||"");
    if(!credential){setError("Google did not return a verified account. Please try again.");return}
    setLoading(true);setError("");
    try{
     const result=await fetch("/api/auth/google/native/credential",{method:"POST",headers:{"Content-Type":"application/json"},cache:"no-store",body:JSON.stringify({credential})});
     const data=await result.json();
     if(!result.ok||!data.ok||!data.ticket)throw new Error(data.error||"Unable to finish Google sign-in.");
     window.location.href="com.numelixa.app://auth/callback?ticket="+encodeURIComponent(String(data.ticket));
    }catch(e){setError(e instanceof Error?e.message:"Unable to finish Google sign-in.");setLoading(false)}
   }});
   window.google.accounts.id.renderButton(host.current,{type:"standard",theme:"outline",size:"large",shape:"pill",text:"continue_with",logo_alignment:"left",width:Math.min(340,host.current.clientWidth||340)});
   setReady(true);
  };
  if(window.google?.accounts?.id){render();return()=>{active=false}}
  let script=document.querySelector<HTMLScriptElement>('script[data-numelixa-native-google="true"]');
  if(!script){script=document.createElement("script");script.src="https://accounts.google.com/gsi/client";script.async=true;script.defer=true;script.dataset.numelixaNativeGoogle="true";document.head.appendChild(script)}
  script.addEventListener("load",render);
  script.addEventListener("error",()=>{if(active)setError("Google could not load. Check your internet connection and try again.")});
  return()=>{active=false;script?.removeEventListener("load",render)};
 },[clientId]);
 return <main style={{minHeight:"100vh",boxSizing:"border-box",display:"grid",placeItems:"center",padding:"28px 18px",background:"radial-gradient(ellipse at 50% 0%,#164c68 0%,#0a2035 45%,#030817 100%)",color:"#f5f8ff",fontFamily:"Inter,system-ui,sans-serif"}}>
  <section style={{width:"100%",maxWidth:420,boxSizing:"border-box",padding:"30px 22px",borderRadius:28,border:"1px solid rgba(105,224,228,.2)",background:"rgba(7,25,43,.9)",boxShadow:"0 28px 90px rgba(0,0,0,.35)",textAlign:"center"}}>
   <div style={{width:62,height:62,margin:"0 auto 16px",display:"grid",placeItems:"center",borderRadius:21,background:"linear-gradient(135deg,#51ead5,#158fbd 70%,#2879ff)",color:"#041c28",fontSize:31,fontWeight:950,boxShadow:"0 12px 34px rgba(42,208,219,.22)"}}>N</div>
   <div style={{fontSize:25,fontWeight:900,letterSpacing:"-.8px"}}>Continue with <span style={{color:"#58e8d8"}}>Google</span></div>
   <p style={{color:"#a9bfd0",fontSize:14,lineHeight:1.65,margin:"12px 0 24px"}}>Choose your Google account to securely sign in to Numelixa. After verification, you’ll return to the app automatically.</p>
   <div ref={host} style={{display:"flex",justifyContent:"center",minHeight:44}}/>
   {loading&&<p style={{color:"#62e5cf",fontSize:13}}>Verifying your account and returning to Numelixa…</p>}
   {error&&<p role="alert" style={{color:"#ffc4cf",background:"rgba(133,34,54,.22)",border:"1px solid rgba(255,124,151,.2)",borderRadius:12,padding:12,fontSize:13,lineHeight:1.5}}>{error}</p>}
   {!ready&&!error&&!loading&&<p style={{color:"#88a9bc",fontSize:12,marginTop:14}}>Preparing secure Google sign-in…</p>}
   <p style={{color:"#7290a5",fontSize:11,lineHeight:1.5,marginTop:22}}>Your Google password is never shared with Numelixa.</p>
  </section>
 </main>;
}
