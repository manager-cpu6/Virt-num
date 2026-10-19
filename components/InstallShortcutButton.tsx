"use client";
import {useEffect,useState} from "react";

type InstallPromptEvent=Event&{prompt:()=>Promise<void>;userChoice:Promise<{outcome:"accepted"|"dismissed"}>};
export default function InstallShortcutButton(){
 const[promptEvent,setPromptEvent]=useState<InstallPromptEvent|null>(null);
 const[message,setMessage]=useState("");
 useEffect(()=>{
  const handler=(event:Event)=>{event.preventDefault();setPromptEvent(event as InstallPromptEvent)};
  window.addEventListener("beforeinstallprompt",handler);
  const installed=()=>{setPromptEvent(null);setMessage("Numelixa is installed. You can open it from your home screen or app list.")};
  window.addEventListener("appinstalled",installed);
  return()=>{window.removeEventListener("beforeinstallprompt",handler);window.removeEventListener("appinstalled",installed)};
 },[]);
 async function install(){
  if(promptEvent){
   await promptEvent.prompt();
   const choice=await promptEvent.userChoice;
   setMessage(choice.outcome==="accepted"?"Installation started. Numelixa will appear in your app list or home screen.":"Installation was cancelled. You can use your browser menu to install it later.");
   setPromptEvent(null);
   return;
  }
  setMessage("To install or create a shortcut: open this page in Chrome, tap ⋮, then choose Install app or Add to Home screen. The wording depends on your browser.");
 }
 return <div style={{display:"grid",gap:9}}>
  <button type="button" onClick={install} className="primary-btn full" style={{display:"flex",justifyContent:"center",alignItems:"center",gap:9,cursor:"pointer"}}>Install & create shortcut <span>↗</span></button>
  {message&&<p role="status" style={{fontSize:12,lineHeight:1.6,color:"#a9c5d9",margin:0}}>{message}</p>}
 </div>
}