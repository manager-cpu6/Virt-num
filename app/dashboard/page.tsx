import Link from "next/link";
import TopBar from "@/components/TopBar";
import HomeLiveBoard from "@/components/HomeLiveBoard";
import MobileAppDownloadCTA from "@/components/MobileAppDownloadCTA";
import DashboardWalletCard from "@/components/DashboardWalletCard";
import {getUser} from "@/lib/auth";
import {redirect} from "next/navigation";
export const dynamic="force-dynamic";
export default async function DashboardPage(){
 const user=await getUser().catch(()=>null);
 if(!user)redirect("/login");
 return <div className="reference-dashboard">
  <TopBar/>
  <section className="hero-card home-hero-refresh">
   <div className="hero-copy"><span className="eyebrow">NUMELIXA • LIVE</span><h1>Your global numbers, <span className="nx-gradient-text">made simple.</span></h1><p>Explore live number availability, track SMS in real time, and manage your USD wallet from one secure workspace.</p><Link className="primary-btn" href="/services">Get a number <span>→</span></Link></div>
   <div className="nx-earth-illustration nx-network-visual" aria-hidden="true"><span className="nx-earth-globe"/><span className="nx-earth-orbit"/><span className="nx-earth-satellite"/><span className="nx-network-ring nx-ring-one"/><span className="nx-network-ring nx-ring-two"/><span className="nx-network-node nx-node-one"/><span className="nx-network-node nx-node-two"/><span className="nx-network-node nx-node-three"/><span className="nx-network-label nx-network-label-top">GLOBAL SMS</span><span className="nx-network-label nx-network-label-bottom">LIVE CONNECTIVITY</span></div>
  </section>
  <DashboardWalletCard/>
  <HomeLiveBoard/>
  <section className="quick-access-section" aria-label="Quick access">
   <div className="section-head"><div><span className="eyebrow">QUICK ACCESS</span><h2>Your shortcuts</h2></div></div>
   <div className="quick-grid">
    <Link href="/services" className="quick-card"><span className="quick-icon quick-icon-cyan" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><rect x="6" y="2.8" width="12" height="18.4" rx="2.7"/><path d="M10 18h4M12 7v6m-3-3h6"/></svg></span><div><b>Get a number</b><small>Choose an app & country</small></div><i aria-hidden="true">→</i></Link>
    <Link href="/numbers" className="quick-card"><span className="quick-icon quick-icon-violet" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><path d="M7 3.5h8l4 4V20a1.5 1.5 0 0 1-1.5 1.5h-11A1.5 1.5 0 0 1 5 20V5a1.5 1.5 0 0 1 1.5-1.5Z"/><path d="M14.5 3.8V8H19M8.5 13h7m-7 3.5h4"/><path d="m14.5 17 1.5 1.5 3-3"/></svg></span><div><b>My orders</b><small>Live activations and SMS status</small></div><i aria-hidden="true">→</i></Link>
    <Link href="/wallet" className="quick-card"><span className="quick-icon quick-icon-blue" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><rect x="2.8" y="5.5" width="18.4" height="14.8" rx="2.8"/><path d="M3.5 8h14a2 2 0 0 0 2-2V5a2 2 0 0 0-2-2H6a3 3 0 0 0-3 3v12"/><path d="M15.5 12.5h5.2v4h-5.2a2 2 0 0 1 0-4Z"/></svg></span><div><b>Wallet</b><small>USD balance & top up</small></div><i aria-hidden="true">→</i></Link>
    <Link href="/developers/docs" className="quick-card"><span className="quick-icon quick-icon-cyan" aria-hidden="true"><svg viewBox="0 0 24 24" fill="none"><path d="m8.5 7-5 5 5 5M15.5 7l5 5-5 5M14 4l-4 16"/></svg></span><div><b>Developer API</b><small>API keys and integration tools</small></div><i aria-hidden="true">→</i></Link>
   </div>
  </section>
  <a className="nx-whatsapp-help" href="https://wa.me/252907868526" target="_blank" rel="noopener noreferrer" aria-label="Contact Numelixa support on WhatsApp"><span className="nx-whatsapp-icon" aria-hidden="true"><img src="https://cdn.simpleicons.org/whatsapp/FFFFFF" alt="" width="25" height="25" /></span><span><b>Need help?</b><small>Chat with us on WhatsApp</small></span><strong>→</strong></a>
  <MobileAppDownloadCTA/>
 </div>
}