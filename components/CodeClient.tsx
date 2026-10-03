"use client";
import {useEffect,useState} from "react";

type Props={orderId:string;phoneNumber:string;service:string;country:string};

const serviceNames:Record<string,string>={
 whatsapp:"WhatsApp",telegram:"Telegram",google:"Google",facebook:"Facebook",instagram:"Instagram",
 tiktok:"TikTok",twitter:"X / Twitter",x:"X",snapchat:"Snapchat",viber:"Viber",discord:"Discord",
 amazon:"Amazon",microsoft:"Microsoft",apple:"Apple",signal:"Signal",wechat:"WeChat",yahoo:"Yahoo",
 openai:"OpenAI/ChatGPT",claudeai:"Claude AI/Anthropic"
};
function serviceName(s:string){return serviceNames[s.toLowerCase()]||s.replace(/[_-]+/g," ").replace(/\b\w/g,c=>c.toUpperCase())}

function friendlyError(value:string){
 const x=value.toLowerCase();
 if(x.includes("no free")||x.includes("no stock")||x.includes("out of stock")) return "No free Numbers";
 if(x.includes("not enough user balance")||x.includes("balance")) return "Service unavailable";
 if(x.includes("price_changed")||x.includes("price changed")||x.includes("maxprice")) return "Price changed";
 if(x.includes("bad country")||x.includes("bad operator")||x.includes("no product")) return "Service unavailable";
 if(x.includes("server offline")||x.includes("temporarily unavailable")||x.includes("timeout")) return "Service temporarily unavailable";
 if(x.includes("provider")||x.includes("5sim")) return "Unable to get number";
 return value.replace(/5SIM[^:]*:\s*/ig,"").trim()||"Unable to complete the request";
}

export default function CodeClient({orderId,phoneNumber,service,country}:Props){
 const[code,setCode]=useState(""),[status,setStatus]=useState("waiting"),[loading,setLoading]=useState(false),[seconds,setSeconds]=useState(600),[error,setError]=useState(""),[copied,setCopied]=useState("");
 const name=serviceName(service),slug=service.toLowerCase();
 const [logoLoaded,setLogoLoaded]=useState(true);

 async function copyText(value:string,label:string){
   if(!value)return;
   try{await navigator.clipboard.writeText(value);setCopied(label);window.setTimeout(()=>setCopied(""),1400)}catch{setCopied("")}
 }
 async function getCode(){
   if(code||status==="refunded"||status==="cancelled")return;
   setLoading(true);setError("");
   try{
     const r=await fetch("/api/orders/code",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({orderId})});
     const d=await r.json();
     if(d.ok){setCode(d.code||"");setStatus(d.status||"waiting");if(d.timeLeft!=null)setSeconds(Number(d.timeLeft))}
     else{setStatus(d.status||"refunded");setError(friendlyError(d.error||"Unable to check the SMS"))}
   }catch{setError("Unable to check SMS")}
   finally{setLoading(false)}
 }
 async function cancelOrder(){
   if(!confirm("Cancel this number? Your coins will be refunded if cancellation is accepted."))return;
   setLoading(true);setError("");
   try{
     const r=await fetch("/api/orders",{method:"DELETE",headers:{"Content-Type":"application/json"},body:JSON.stringify({orderId})}),d=await r.json();
     if(!d.ok)throw new Error(d.error||"Unable to cancel");
     setStatus("cancelled");setError("Order cancelled. Your coins were refunded.");
   }catch(e){setError(friendlyError(e instanceof Error?e.message:"Unable to cancel"))}
   finally{setLoading(false)}
 }
 useEffect(()=>{getCode();const t=setInterval(()=>{if(!code&&status==="waiting")getCode()},5000);return()=>clearInterval(t)},[orderId,code,status]);
 useEffect(()=>{if(status!=="waiting")return;const t=setInterval(()=>setSeconds(s=>Math.max(0,s-1)),1000);return()=>clearInterval(t)},[status]);
 const m=Math.floor(seconds/60),s=seconds%60;
 return <div className="code-area">
   <div className="order-service-head">
     <span className={"service-badge service-icon-"+slug}>
       {logoLoaded ? <img src={"https://cdn.simpleicons.org/"+slug} alt={name+" logo"} onLoad={()=>setLogoLoaded(true)} onError={()=>setLogoLoaded(false)}/> : <span className="service-fallback">{name.slice(0,1).toUpperCase()}</span>}
     </span>
     <div><b>{name}</b><small>{country}</small></div>
   </div>

   <div className="number-box">
     <div><span className="mini-label">YOUR NUMBER</span><strong>{phoneNumber}</strong></div>
     <button className="copy-icon-btn" type="button" onClick={()=>copyText(phoneNumber,"number")} aria-label="Copy number" title="Copy number">
       <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M6 15H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v1"/></svg>
     </button>
   </div>

   <div className={"otp-panel "+(code?"received":"")}>
     <div className="otp-label"><span>SMS CODE</span>{code?<b>RECEIVED</b>:<b>WAITING</b>}</div>
     {code
       ? <><div className="otp-row"><strong>{code}</strong><button className="copy-code-btn" type="button" onClick={()=>copyText(code,"code")}><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><rect x="9" y="9" width="11" height="11" rx="2"/><path d="M6 15H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v1"/></svg>Copy</button></div><span className="waiting-dot success-dot">● SMS received</span></>
       : status==="waiting"
         ? <><div className="otp-placeholder">— — — — — —</div><button className="primary-btn full" onClick={getCode} disabled={loading}>{loading?"Checking SMS…":"Check for code"}</button><span className="waiting-dot">● Waiting for SMS · {m}:{String(s).padStart(2,"0")}</span></>
         : <span className="waiting-dot">● {friendlyError(status)}</span>}
   </div>

   {copied&&<div className="copy-toast">✓ {copied==="number"?"Number":"Code"} copied</div>}
   {status==="waiting"&&seconds>300&&<button className="secondary-btn full cancel-number-btn" onClick={cancelOrder} disabled={loading}>Cancel & refund</button>}
   {error&&<div className={status==="cancelled"||status==="refunded"?"success-box":"error-box"}>{friendlyError(error)}</div>}
 </div>
}