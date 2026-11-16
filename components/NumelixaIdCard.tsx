"use client";
import {useState} from "react";
export default function NumelixaIdCard({publicId}:{publicId:string}){
 const [copied,setCopied]=useState(false);
 async function copy(){try{await navigator.clipboard.writeText(publicId);setCopied(true);window.setTimeout(()=>setCopied(false),1800)}catch{setCopied(false)}}
 return <section className="account-id-card" aria-label="Your Numelixa ID">
  <div className="account-id-main"><span><i className="account-id-shield">✓</i> YOUR NUMELIXA ID</span><code>{publicId}</code><small>Use this 7-digit ID whenever you contact Numelixa Support.</small></div>
  <button type="button" className="account-id-copy" onClick={()=>void copy()} aria-label="Copy Numelixa ID">{copied?"✓ Copied":"▢ Copy"}</button>
 </section>
}