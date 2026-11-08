"use client";
import {useEffect} from "react";
import {usePathname} from "next/navigation";

function visitorId(){
  try{
    let id=sessionStorage.getItem("nx_visitor_id");
    if(!id){id=typeof crypto!=="undefined"&&"randomUUID" in crypto?crypto.randomUUID():"nx-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2);sessionStorage.setItem("nx_visitor_id",id);}
    return id;
  }catch{return "nx-"+Date.now().toString(36)+"-"+Math.random().toString(36).slice(2);}
}
function send(event:"pageview"|"click",path:string,label=""){
  const payload=JSON.stringify({event,path,visitorId:visitorId(),label});
  void fetch("/api/analytics/track",{method:"POST",headers:{"Content-Type":"application/json"},body:payload,keepalive:true}).catch(()=>{});
}
export default function AnalyticsTracker(){
  const pathname=usePathname();
  useEffect(()=>{
    if(!pathname||pathname.startsWith("/admin"))return;
    send("pageview",pathname);
  },[pathname]);
  useEffect(()=>{
    const onClick=(event:MouseEvent)=>{
      const target=event.target;
      if(!(target instanceof Element))return;
      const control=target.closest("a,button,[role='button']");
      if(!control)return;
      const path=window.location.pathname;
      if(path.startsWith("/admin")||path.startsWith("/api/"))return;
      const label=control.getAttribute("data-analytics")||control.getAttribute("aria-label")||control.getAttribute("title")||control.tagName.toLowerCase();
      send("click",path,label);
    };
    document.addEventListener("click",onClick,true);
    return()=>document.removeEventListener("click",onClick,true);
  },[]);
  return null;
}
