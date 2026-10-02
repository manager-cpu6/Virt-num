"use client";
import {useState} from "react";
import {useRouter} from "next/navigation";
type Props={service:string;country:string;countryName?:string};
export default function GetNumberClient({service,country,countryName}:Props){
 const router=useRouter();const[loading,setLoading]=useState(false);const[error,setError]=useState("");
 async function getNumber(){
  setLoading(true);setError("");
  try{
   const r=await fetch("/api/orders",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({service,country,countryCode:country,countryName:countryName||country})});
   const d=await r.json();
   if(r.status===401){router.push("/login?next=/get-code/new");return}
   if(r.status===402){router.push("/wallet");return}
   if(!d.ok)throw new Error(d.error||"Something went wrong");
   router.push(`/get-code/${d.order.id}`);
  }catch(e){setError(e instanceof Error?e.message:"Something went wrong")}finally{setLoading(false)}
 }
 return <div className="purchase-card"><div className="purchase-line"><span>Service</span><b>{service}</b></div><div className="purchase-line"><span>Country</span><b>{countryName||country}</b></div><div className="purchase-line"><span>Number price</span><strong>Price calculated at checkout</strong></div><div className="purchase-line muted"><span>After purchase</span><b>Get Code →</b></div>{error&&<div className="error-box">{error}</div>}<button className="primary-btn full" onClick={getNumber} disabled={loading}>{loading?"Reserving…":"Get Number"}</button></div>;
}