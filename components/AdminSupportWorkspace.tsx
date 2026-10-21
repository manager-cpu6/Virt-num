"use client";
import Link from "next/link";
import {useState} from "react";
import AdminHelpChat from "@/components/AdminHelpChat";
import AdminSupportTeam from "@/components/AdminSupportTeam";
export default function AdminSupportWorkspace({role}:{role:string}){
 const [signingOut,setSigningOut]=useState(false);
 async function signOut(){setSigningOut(true);try{await fetch("/api/auth/logout",{method:"POST",credentials:"include"});}finally{window.location.href="/login";}}
 return <main style={{minHeight:"100vh",background:"#030817",color:"#f5f8ff",padding:"24px max(14px,calc((100vw - 1280px)/2)) 60px"}}>
  <header style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,flexWrap:"wrap",padding:"8px 0 18px",borderBottom:"1px solid #1d344a"}}>
   <div><span style={{fontSize:10,letterSpacing:".18em",fontWeight:900,color:"#00d9ff"}}>NUMELIXA · HELP TEAM</span><h1 style={{margin:"7px 0",fontSize:"clamp(25px,4vw,34px)"}}>Support Center</h1><p style={{margin:0,color:"#9bb2c8",fontSize:13}}>{role==="admin"?"Primary administrator · all conversations":role==="support_admin"?"Support manager · all conversations and team controls":"Support agent workspace · assigned customer conversations only"}</p></div>
   <div style={{display:"flex",gap:9,flexWrap:"wrap"}}>{role==="admin"&&<Link href="/admin" className="secondary-btn">Main admin dashboard</Link>}<button className="secondary-btn" disabled={signingOut} onClick={()=>void signOut()}>{signingOut?"Signing out…":"Sign out"}</button></div>
  </header>
  <AdminHelpChat/>{(role==="admin"||role==="support_admin")&&<AdminSupportTeam/>}
 </main>
}
