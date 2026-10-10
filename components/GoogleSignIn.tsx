"use client";
import {useEffect,useRef,useState} from "react";

declare global { interface Window { google?:any; __numelixaGoogleScript?:boolean } }

export default function GoogleSignIn({onSuccess}:{onSuccess:()=>void}){
 const host=useRef<HTMLDivElement|null>(null);
 const onSuccessRef=useRef(onSuccess);onSuccessRef.current=onSuccess;
 const[error,setError]=useState("");
 const[loading,setLoading]=useState(false);
 useEffect(()=>{
  let active=true;
  const clientId=String(process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID||"").trim();
  if(!clientId){setError("Google sign-in is not configured. Add NEXT_PUBLIC_GOOGLE_CLIENT_ID in Vercel.");return}
  const render=()=>{
   if(!active||!host.current||!window.google?.accounts?.id)return;
   host.current.innerHTML="";
   window.google.accounts.id.initialize({
    client_id:clientId,
    callback:async(response:any)=>{
     if(!active)return;
     setLoading(true);setError("");
     try{
      const result=await fetch("/api/auth/google",{method:"POST",credentials:"include",cache:"no-store",headers:{"Content-Type":"application/json"},body:JSON.stringify({credential:response?.credential})});
      const data=await result.json();
      if(!result.ok||!data.ok)throw new Error(data.error||"Google sign-in failed.");
      window.dispatchEvent(new Event("numelixa-auth-ready"));
      onSuccessRef.current();
     }catch(e){setError(e instanceof Error?e.message:"Unable to sign in with Google.");}
     finally{if(active)setLoading(false)}
    },
    auto_select:false,
    cancel_on_tap_outside:true
   });
   window.google.accounts.id.renderButton(host.current,{type:"standard",theme:"outline",size:"large",shape:"pill",text:"continue_with",logo_alignment:"left",width:Math.min(360,host.current.clientWidth||360)});
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
 },[]);
 return <div className="google-signin-wrap"><div ref={host} className="google-signin-button"/>{loading&&<div className="google-signin-loading">Signing in with Google…</div>}{error&&<p className="google-signin-error" role="status">{error}</p>}</div>;
}
