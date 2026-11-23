"use client";
import Link from "next/link";
import {useState} from "react";
import PublicFooter from "@/components/PublicFooter";
const email="support@numelixa.com";
const opportunities=[
 {title:"Business partnerships",description:"Discuss business use cases, platform collaboration and service requirements.",subject:"Numelixa business partnership enquiry"},
 {title:"Technical partnerships",description:"Talk through infrastructure, integration requirements and technical collaboration.",subject:"Numelixa technical partnership enquiry"},
 {title:"API partnerships",description:"Explore production API access, integration design and developer requirements.",subject:"Numelixa API partnership enquiry"},
 {title:"Reseller opportunities",description:"Ask about reseller arrangements and whether a suitable programme is available.",subject:"Numelixa reseller opportunity enquiry"},
 {title:"Affiliate opportunities",description:"No public affiliate programme is currently documented. Contact the team to ask whether an arrangement is available.",subject:"Numelixa affiliate programme enquiry"}
];
export default function PartnersPage(){
 const[copied,setCopied]=useState(false);
 async function copy(){try{await navigator.clipboard.writeText(email);setCopied(true);window.setTimeout(()=>setCopied(false),1800)}catch{setCopied(false)}}
 return <main className="nx-guide-page"><header className="nx-guide-nav"><Link href="/" className="nx-guide-brand"><img src="/numelixa-app-icon.webp" alt="" width="34" height="34"/> NUMELIXA</Link><nav><Link href="/developers/docs">API documentation</Link><Link href="/clients">For clients</Link><Link href="/support">Support</Link></nav></header><section className="nx-guide-hero"><span className="nx-guide-kicker">NUMELIXA · PARTNERS</span><h1>Build something useful together.</h1><p>We welcome relevant business, technical and API partnership enquiries. Tell us what you are building and what kind of collaboration you have in mind.</p></section><section className="nx-partner-grid">{opportunities.map(item=><article key={item.title}><span className="nx-partner-icon" aria-hidden="true">↗</span><h2>{item.title}</h2><p>{item.description}</p><a href={"mailto:"+email+"?subject="+encodeURIComponent(item.subject)}>Email about this <span>→</span></a></article>)}</section><section className="nx-partner-contact"><div><span className="nx-guide-kicker">OFFICIAL CONTACT ROUTE</span><h2>Partner enquiries</h2><p>No separate partner email is published. Use the configured Numelixa support address and include the relevant partnership subject.</p><strong>{email}</strong></div><div className="nx-partner-actions"><button type="button" onClick={copy}>{copied?"Copied":"Copy email"}</button><a href={"mailto:"+email+"?subject="+encodeURIComponent("Numelixa partnership enquiry")}>Open email ↗</a></div></section><PublicFooter/></main>
}
