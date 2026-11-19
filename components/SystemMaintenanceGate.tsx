"use client";
import {useEffect,useState} from "react";
import {usePathname} from "next/navigation";

export default function SystemMaintenanceGate({children,initialEnabled=false,initialMessage=""}:{children:React.ReactNode;initialEnabled?:boolean;initialMessage?:string}){
 const path=usePathname();
 const [enabled,setEnabled]=useState(initialEnabled);
 const [message,setMessage]=useState(initialMessage||"Numelixa is temporarily under maintenance. Please check back soon.");
 useEffect(()=>{
  let alive=true;
  const refresh=async()=>{try{const r=await fetch("/api/system/status",{cache:"no-store"});const d=await r.json();if(alive&&d.ok){setEnabled(d.websiteEnabled===true);setMessage(String(d.message||message));}}catch{}};
  void refresh();
  const id=window.setInterval(refresh,30000);
  return()=>{alive=false;window.clearInterval(id)};
 },[]);
 if(path.startsWith("/admin"))return <>{children}</>;
 if(!enabled)return <>{children}</>;
 return <main style={{minHeight:"75vh",display:"grid",placeItems:"center",padding:"32px 20px",background:"#030817",color:"#f5f8ff"}}>
  <section style={{width:"min(100%,560px)",textAlign:"center",padding:"36px 28px",borderRadius:28,border:"1px solid #24415f",background:"linear-gradient(145deg,#0c1b32,#071124)",boxShadow:"0 24px 80px #0008"}}>
   <div style={{width:68,height:68,margin:"0 auto 22px",display:"grid",placeItems:"center",borderRadius:22,background:"#102c4c",color:"#00d9ff",fontSize:30}}>⚙</div>
   <div style={{fontSize:11,fontWeight:900,letterSpacing:3,color:"#00d9ff"}}>NUMELIXA SERVICE NOTICE</div>
   <h1 style={{fontSize:32,lineHeight:1.15,margin:"12px 0",fontWeight:900}}>We’ll be back shortly</h1>
   <p style={{color:"#a9bad0",lineHeight:1.7,margin:"0 auto 24px"}}>{message}</p>
   <a href="mailto:support@numelixa.com" style={{display:"inline-flex",padding:"12px 18px",borderRadius:13,background:"#1677ff",color:"#fff",fontWeight:800,textDecoration:"none"}}>Contact support</a>
  </section>
 </main>;
}
