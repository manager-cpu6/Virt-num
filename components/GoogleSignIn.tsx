"use client";
import {useEffect,useRef,useState} from "react";
import {Capacitor,registerPlugin} from "@capacitor/core";
type NativeGoogleSignInPlugin={signIn:(options:{serverClientId:string})=>Promise<{idToken:string}>};
const NativeGoogleSignIn=registerPlugin<NativeGoogleSignInPlugin>("NumelixaGoogleSignIn");

declare global { interface Window { google?:any; __numelixaGoogleScript?:boolean } }
function credentialEmail(credential:string){try{const payload=credential.split(".")[1];if(!payload)return "";const normalized=payload.replace(/-/g,"+").replace(/_/g,"/");const decoded=atob(normalized+"=".repeat((4-normalized.length%4)%4));return String(JSON.parse(decoded).email||"").trim().toLowerCase()}catch{return ""}}
function saveLastLogin(email:string){const normalized=String(email||"").trim().toLowerCase();if(normalized.includes("@")){try{localStorage.setItem("numelixa:last-login-email",normalized)}catch{}}}

export default function GoogleSignIn({onSuccess}:{onSuccess:()=>void}){
 const host=useRef<HTMLDivElement|null>(null);
 const onSuccessRef=useRef(onSuccess);onSuccessRef.current=onSuccess;
 const[error,setError]=useState("");
 const[loading,setLoading]=useState(false);
 const[isNative,setIsNative]=useState(false);
 const[webReady,setWebReady]=useState(false);
 const[clientId,setClientId]=useState("");
 const[configLoaded,setConfigLoaded]=useState(false);
 const[lastLogin,setLastLogin]=useState("");
 const[loginHint,setLoginHint]=useState("");
 useEffect(()=>{try{const recent=String(localStorage.getItem("numelixa:last-login-email")||"").trim().toLowerCase();if(recent.includes("@")){setLastLogin(recent);setLoginHint(recent)}}catch{}},[]);

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
  const email=credentialEmail(credential);if(email){saveLastLogin(email);setLastLogin(email)}
  window.dispatchEvent(new Event("numelixa-auth-ready"));
  onSuccessRef.current();
 }

 useEffect(()=>{
  setIsNative(Capacitor.isNativePlatform());
 },[]);

 function diagnoseNativeGoogleSignIn(){
  const cap=(window as any).Capacitor;
  const headers=Array.isArray(cap?.PluginHeaders)?cap.PluginHeaders:[];
  const header=headers.find((entry:any)=>entry?.name==="NumelixaGoogleSignIn");
  const legacyPlugins=cap?.Plugins;
  const report={
   platform:cap?.getPlatform?.()||"unknown",
   isNativePlatform:cap?.isNativePlatform?.()??null,
   isPluginAvailable:cap?.isPluginAvailable?.("NumelixaGoogleSignIn")??null,
   capacitorPresent:!!cap,
   pluginsObjectPresent:!!legacyPlugins,
   pluginHeaderCount:headers.length,
   matchingPluginHeader:header||null,
   legacyPluginObjectPresent:!!legacyPlugins?.NumelixaGoogleSignIn,
   legacyPluginMethods:legacyPlugins?.NumelixaGoogleSignIn?Object.keys(legacyPlugins.NumelixaGoogleSignIn):[]
  };
  console.info("[Numelixa native Google sign-in runtime diagnostic]",report);
  console.info("NUMELIXA_JS_RUNTIME_DIAGNOSTIC window.Capacitor",cap);
  console.info("NUMELIXA_JS_RUNTIME_DIAGNOSTIC window.Capacitor.getPlatform()",cap?.getPlatform?.());
  console.info("NUMELIXA_JS_RUNTIME_DIAGNOSTIC window.Capacitor.Plugins",legacyPlugins);
  console.info("NUMELIXA_JS_RUNTIME_DIAGNOSTIC window.Capacitor.PluginHeaders",cap?.PluginHeaders);
  console.info("NUMELIXA_JS_RUNTIME_DIAGNOSTIC imported Capacitor runtime",Capacitor);
  console.info("NUMELIXA_JS_RUNTIME_DIAGNOSTIC native plugin proxy",NativeGoogleSignIn);
  console.info("NUMELIXA_JS_RUNTIME_DIAGNOSTIC native plugin proxy signIn",NativeGoogleSignIn.signIn);
  console.info("NUMELIXA_JS_RUNTIME_DIAGNOSTIC imported isPluginAvailable",Capacitor.isPluginAvailable("NumelixaGoogleSignIn"));
  console.info("NUMELIXA_JS_RUNTIME_DIAGNOSTIC global and imported object identical",cap===Capacitor);
  return report;
 }
 async function nativeSignIn(){
  setLoading(true);setError("");
  const diagnostic=diagnoseNativeGoogleSignIn();
  if(diagnostic.isPluginAvailable===false || !diagnostic.matchingPluginHeader){
   const message="Native Google sign-in is not exposed by the Capacitor Bridge. Runtime diagnostics were written to the WebView console.";
   console.error("NUMELIXA_PLUGIN_HEADER_MISSING",diagnostic);
   setError(message);
   setLoading(false);
   return;
  }
  try{
   if(!clientId)throw new Error("Google sign-in is not configured. Please try again later.");
   const result=await NativeGoogleSignIn.signIn({serverClientId:clientId});
   const idToken=String(result?.idToken||"").trim();
   if(!idToken)throw new Error("Google did not return an ID token. Please try again.");
   await completeSignIn(idToken);
  }catch(e){
   const message=e instanceof Error?e.message:String(e||"");
   console.warn("[Numelixa native Google sign-in]",message);
   if(/CANCELED|CANCELLED|USER_CANCELED|GetCredentialCancellationException/i.test(message)){setError("");}
   else if(/NO_CREDENTIAL|NoCredentialException|no credential|no google account/i.test(message)){setError("No Google account is available on this device. Add a Google account in Android Settings and try again.");}
   else if(/network|unable to resolve|timeout|offline|failed to connect/i.test(message)){setError("Could not reach Google or Numelixa. Check your internet connection and try again.");}
   else if(/invalid|expired|token/i.test(message)){setError("Google sign-in could not be verified. Please try again.");}
   else{setError(message||"Unable to sign in with Google. Please try again.");}
  }finally{setLoading(false)}
 }
 function continueLastLogin(){if(!lastLogin)return;if(isNative){void nativeSignIn();return}setLoginHint(lastLogin);setError("");window.setTimeout(()=>{try{window.google?.accounts?.id?.prompt()}catch{}},350)}
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
    login_hint:loginHint||undefined,
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
 },[isNative,clientId,configLoaded,loginHint]);

 const GoogleMark=()=><svg width="20" height="20" viewBox="0 0 48 48" aria-hidden="true"><path fill="#EA4335" d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"/><path fill="#4285F4" d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.75 7.18l7.73 6C44.43 37.98 46.98 31.88 46.98 24.55z"/><path fill="#FBBC05" d="M10.53 28.59A14.4 14.4 0 0 1 9.75 24c0-1.59.27-3.13.76-4.59l-7.98-6.19A23.9 23.9 0 0 0 0 24c0 3.87.93 7.52 2.56 10.78l7.97-6.19z"/><path fill="#34A853" d="M24 48c6.48 0 11.93-2.13 15.91-5.8l-7.73-6c-2.15 1.45-4.92 2.3-8.18 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"/></svg>;

 if(isNative)return <div className="google-signin-wrap" style={{width:"100%",display:"flex",flexDirection:"column",alignItems:"center"}}><button type="button" onClick={()=>void nativeSignIn()} disabled={loading} className="google-signin-fallback" style={{width:"100%",minHeight:48,display:"flex",alignItems:"center",justifyContent:"center",gap:12,border:"1px solid #d7dce5",borderRadius:999,background:"#fff",color:"#202124",fontWeight:600,fontSize:15,cursor:loading?"wait":"pointer",opacity:loading?0.7:1}}><GoogleMark/>{loading?"Signing in…":"Continue with Google"}</button>{lastLogin&&<button type="button" onClick={continueLastLogin} disabled={loading} style={{marginTop:10,width:"100%",maxWidth:340,minHeight:44,borderRadius:14,border:"1px solid rgba(83,218,208,.28)",background:"rgba(18,53,73,.72)",color:"#e9ffff",fontSize:13,fontWeight:700,cursor:"pointer"}}>Continue as {lastLogin}</button>}{error&&<p className="google-signin-error" role="status">{error}</p>}</div>;
 return <div className="google-signin-wrap" style={{width:"100%",display:"flex",flexDirection:"column",alignItems:"center"}}>{!webReady&&<button type="button" className="google-signin-fallback" onClick={()=>{if(!clientId){setError("Google sign-in is not configured. Set GOOGLE_CLIENT_ID in Vercel.");return}if(window.google?.accounts?.id){window.google.accounts.id.prompt();return}setError("Google sign-in is still loading. Please wait a moment and try again.")}} style={{width:"100%",minHeight:48,display:"flex",alignItems:"center",justifyContent:"center",gap:12,border:"1px solid #d7dce5",borderRadius:999,background:"#fff",color:"#202124",fontWeight:600,fontSize:15}}><GoogleMark/>Continue with Google</button>}<div ref={host} className="google-signin-button" style={{display:webReady?"flex":"none",justifyContent:"center",width:"100%"}}/>{loading&&<div className="google-signin-loading">Signing in with Google…</div>}{lastLogin&&<button type="button" onClick={continueLastLogin} disabled={loading} style={{marginTop:10,width:"100%",maxWidth:340,minHeight:44,borderRadius:14,border:"1px solid rgba(83,218,208,.28)",background:"rgba(18,53,73,.72)",color:"#e9ffff",fontSize:13,fontWeight:700,cursor:"pointer"}}>Continue as {lastLogin}</button>}{error&&<p className="google-signin-error" role="status">{error}</p>}</div>;
}
