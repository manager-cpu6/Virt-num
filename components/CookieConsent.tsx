"use client";
import {useEffect,useState} from "react";
export default function CookieConsent(){
 const [visible,setVisible]=useState(false);
 useEffect(()=>{try{setVisible(localStorage.getItem("numelixa-cookie-choice")==null)}catch{setVisible(true)}},[]);
 function choose(value:"accepted"|"rejected"){try{localStorage.setItem("numelixa-cookie-choice",value)}catch{}if(value==="accepted")window.dispatchEvent(new Event("numelixa-cookie-consent"));setVisible(false)}
 if(!visible)return null;
 return <aside className="nx-cookie-consent" role="dialog" aria-label="Cookie preferences"><div><b>Privacy choices</b><p>Numelixa uses essential storage to keep your account secure. You can allow or reject optional analytics cookies. Read our <a href="/cookie-policy">Cookie Policy</a>.</p></div><div className="nx-cookie-actions"><button onClick={()=>choose("rejected")}>Reject optional</button><button onClick={()=>choose("accepted")}>Accept all</button></div></aside>;
}
