"use client";
import {useEffect,useRef,useState} from "react";
import {Capacitor} from "@capacitor/core";
import {SocialLogin} from "@capgo/capacitor-social-login";

declare global { interface Window { google?:any; __numelixaGoogleScript?:boolean } }

export default function GoogleSignIn({onSuccess}:{onSuccess:()=>void}){
 const host=useRef<HTMLDivElement|null>(null);
 const onSuccessRef=useRef(onSuccess);onSuccessRef.current=onSuccess;
 const[error,setError]=useState("");
 const[loading,setLoading]=useState(false);
 const[isNative,setIsNative]=useState(false);
 const[initialized,setInitialized]=useState(false);
 const[webReady,setWebReady]=useState(false);
 const[clientId,setClientId]=useState("");
 const[configLoaded,setConfigLoaded]=useState(false);

 useEffect(()=>{
  let active=true;
  fetch("/api/auth/google/config",{cache:"no-store"})
   .then(async response=>{const data=await response.json().catch(()=>({}));if(!response.ok)throw new Error(data.error||"Google sign-in configuration unavailable.");return String(data.clientId||"").trim()})
   .then(id=>{if(active){setClientId(id);setConfigLoaded(true);if(!id)setError("Google sign-in is not configured. Set GOOGLE_CLIENT_ID in Vercel.")}})
   .catch(()=>{if(active){setConfigLoaded(true);setError("Google sign-in configuration could not be loaded. Please try again.")}});
  return()=>{active=false};
 },[]);

 async function completeSignIn(credential:string){
  if(!credential)throw new Error("Google did not return a sign-in token.");
  const result=await fetch("/api/auth/google",{method:"POST",credentials:"include",cache:"no-store",headers:{"Content-Type":"application/json"},body:JSON.stringify({credential})});
  const data=await result.json();
  if(!result.ok||!data.ok)throw new Error(data.error||"Google sign-in failed.");
  window.dispatchEvent(new Event("numelixa-auth-ready"));
  onSuccessRef.current();
 }

 useEffect(()=>{
  const native=Capacitor.isNativePlatform();
  setIsNative(native);
  if(!native)return;
  let active=true;
  if(!configLoaded)return;
  if(!clientId){setError("Google sign-in is not configured. Set GOOGLE_CLIENT_ID in Vercel.");return}
  SocialLogin.initialize({google:{webClientId:clientId,mode:"online"}})
   .then(()=>{if(active)setInitialized(true)})
   .catch((e:any)=>{if(active)setError(e?.message||"Unable to initialize native Google sign-in.")});
  return()=>{active=false};
 },[clientId,configLoaded]);

 async function nativeSignIn(){
  if(!clientId){setError("Google sign-in is not configured. Set GOOGLE_CLIENT_ID in Vercel.");return}
  setLoading(true);setError("");
  try{
   if(!initialized)await SocialLogin.initialize({google:{webClientId:clientId,mode:"online"}});
   const response:any=await SocialLogin.login({provider:"google",options:{scopes:["email","profile"]}});
   const credential=String(response?.result?.idToken||"").trim();
   if(!credential)throw new Error("Google did not return an ID token. Please try again.");
   await completeSignIn(credential);
  }catch(e){
   const message=e instanceof Error?e.message:"Unable to sign in with Google.";
   if(!/cancel|dismiss/i.test(message))setError(message);
  }finally{setLoading(false)}
 }

 useEffect(()=>{
  if(isNative)return;
  let active=true;
  if(!configLoaded)return;
  if(!clientId){setError("Google sign-in is not configured. Set GOOGLE_CLIENT_ID in Vercel.");return}
  const render=()=>{
   if(!active||!host.current||!window.google?.accounts?.id)return;
   host.current.innerHTML="";
   window.google.accounts.id.initialize({
    client_id:clientId,
    callback:async(response:any)=>{
     if(!active)return;
     setLoading(true);setError("");
     try{await completeSignIn(String(response?.credential||""))}
     catch(e){setError(e instanceof Error?e.message:"Unable to sign in with Google.")}
     finally{if(active)setLoading(false)}
    },
    auto_select:false,
    cancel_on_tap_outside:true
   });
   window.google.accounts.id.renderButton(host.current,{type:"standard",theme:"outline",size:"large",shape:"pill",text:"continue_with",logo_alignment:"left",width:Math.min(360,host.current.clientWidth||360)});
   setWebReady(true);
  };
  if(window.google?.accounts?.id){render();return()=>{active=false}}
  let script=document.querySelector<HTMLScriptElement>('script[data-numelixa-google="true"]');
  if(!script){
   script=document.createElement("script");
   script.src="https://accounts.google.com/gsi/client";
   script.async=true;script.defer=true;script.dataset.numelixaGoogle="true";
   document.head.appendChild(script);
  }
  script.addEventListener("load",render);
  script.addEventListener("error",()=>{if(active)setError("Google sign-in could not load. Check your connection and try again.")});
  return()=>{active=false;script?.removeEventListener("load",render)};
 },[isNative,clientId,configLoaded]);

 const GoogleMark=()=><svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.75 7.18l7.73 6C44.43 37.98 46.98 31.88 46.98 24.55z"/><path fill="#FBBC05" d="M10.53 28.59A14.4 14.4 0 0 1 9.75 24c0-1.59.27-3.13.76-4.59l-7.98-6.19A23.9 23.9 0 0 0 0 24c0 3.87.93 7.52 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.91-5.8l-7.73-6c-2.15 1.45-4.92 2.3-8.18 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>;

 if(isNative)return <div className="google-signin-wrap"><button type="button" onClick={nativeSignIn} disabled={loading} className="google-signin-fallback" style={{width:"100%",minHeight:48,display:"flex",alignItems:"center",justifyContent:"center",gap:12,border:"1px solid #d7dce5",borderRadius:999,background:"#fff",color:"#202124",fontWeight:600,fontSize:15,cursor:loading?"wait":"pointer",opacity:loading?0.7:1}}><GoogleMark/>{loading?"Signing in…":"Continue with Google"}</button>{error&&<p className="google-signin-error" role="status">{error}</p>}</div>;
 return <div className="google-signin-wrap">{!webReady&&<button type="button" className="google-signin-fallback" onClick={()=>{if(!clientId){setError("Google sign-in is not configured. Add NEXT_PUBLIC_GOOGLE_CLIENT_ID in Vercel.");return}if(window.google?.accounts?.id){window.google.accounts.id.prompt();return}setError("Google sign-in is still loading. Please wait a moment and try again.")}} style={{width:"100%",minHeight:48,display:"flex",alignItems:"center",justifyContent:"center",gap:12,border:"1px solid #d7dce5",borderRadius:999,background:"#fff",color:"#202124",fontWeight:600,fontSize:15}}><GoogleMark/>Continue with Google</button>}<div ref={host} className="google-signin-button" style={{display:webReady?"block":"none"}}/>{loading&&<div className="google-signin-loading">Signing in with Google…</div>}{error&&<p className="google-signin-error" role="status">{error}</p>}</div>;
}
