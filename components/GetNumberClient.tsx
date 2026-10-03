"use client";
import {useEffect,useState} from "react";
import {useRouter} from "next/navigation";

type Props={service:string;country:string;countryName?:string};
type Stock={count:number;sellCoins:number;usdPrice:number};

const logo:Record<string,string>={wa:"whatsapp",tg:"telegram",go:"google",fb:"facebook",ig:"instagram",lf:"tiktok",tw:"x",sn:"snapchat",vi:"viber",ym:"yahoo",ds:"discord",am:"amazon"};

export default function GetNumberClient({service,country,countryName}:Props){
 const router=useRouter();const[loading,setLoading]=useState(false),[stock,setStock]=useState<Stock|null>(null),[checking,setChecking]=useState(true),[error,setError]=useState("");
 const name=service==="wa"?"WhatsApp":service==="tg"?"Telegram":service||"Service";
 useEffect(()=>{fetch("/api/catalog/stock?country="+encodeURIComponent(country)+"&service="+encodeURIComponent(service),{cache:"no-store"}).then(r=>r.json()).then(d=>{if(d.ok)setStock({count:Number(d.stock.count||0),sellCoins:Number(d.stock.sellCoins||0),usdPrice:Number(d.stock.usdPrice||0)})}).catch(()=>{}).finally(()=>setChecking(false))},[country,service]);
 async function getNumber(){
  setLoading(true);setError("");
  try{
   const r=await fetch("/api/orders",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({service,country,countryCode:country,countryName:countryName||country})});
   const d=await r.json();
   if(r.status===401){router.push("/login?next="+encodeURIComponent("/get-code/new?service="+service+"&country="+country+"&countryName="+(countryName||country)));return}
   if(r.status===402){router.push("/wallet");return}
   if(r.status===403&&d.code==="EMAIL_VERIFICATION_REQUIRED"){router.push("/verify-email");return}
   if(!d.ok)throw new Error(d.error||"Unable to reserve a number.");
   router.push("/get-code/"+d.order.id);
  }catch(e){setError(e instanceof Error?e.message:"Unable to reserve a number.")}finally{setLoading(false)}
 }
 const slug=logo[service.toLowerCase()];
 return <div className="get-number-wrap">
  <div className="code-card get-number-card">
   <span className={"service-badge service-icon-"+service.toLowerCase()}>{slug?<img src={"https://cdn.simpleicons.org/"+slug} alt="" />:name.slice(0,1)}</span>
   <h1>{name}</h1><p>{countryName||country}</p>
   <div className="availability-panel"><div><small>Available numbers</small><strong>{checking?"…":stock?stock.count.toLocaleString():"—"}</strong></div><div><small>Price per number</small><strong>{stock?("$"+stock.usdPrice.toFixed(2)):"—"}</strong><em>{stock?stock.sellCoins.toLocaleString()+" coins":""}</em></div></div>
   <div className="purchase-line"><span>Delivery</span><b>Instant</b></div>
   <div className="purchase-line"><span>SMS window</span><b>Up to 10 minutes</b></div>
   {error&&<div className="error-box">{error}</div>}
   <button className="primary-btn full" onClick={getNumber} disabled={loading||!stock||stock.count<1}>{loading?"Reserving…":"Get Number  →"}</button>
   <div className="purchase-hints"><span>↻ Refund if no SMS within 10 min</span><span>◈ Cancel within 5 min</span></div>
  </div>
 </div>;
}