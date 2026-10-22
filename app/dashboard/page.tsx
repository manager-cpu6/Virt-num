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
  <div className="quick-grid">
   <Link href="/services" className="quick-card"><span>＋</span><div><b>Get a number</b><small>Choose an app & country</small></div><i>→</i></Link>
   <Link href="/wallet" className="quick-card"><span>◈</span><div><b>Wallet</b><small>USD balance & top up</small></div><i>→</i></Link>
  </div>
  <div className="section-head"><div><span className="eyebrow">YOUR SPACE</span><h2>Everything in one place</h2></div></div>
  <div className="quick-grid">
   <Link href="/numbers" className="quick-card"><span>▣</span><div><b>My orders</b><small>Live activations and SMS status</small></div><i>→</i></Link>
   <Link href="/account" className="quick-card"><span>◉</span><div><b>Account</b><small>Profile and session</small></div><i>→</i></Link>
  </div>
  <a className="nx-whatsapp-help" href="https://wa.me/252907868526" target="_blank" rel="noopener noreferrer" aria-label="Contact Numelixa support on WhatsApp"><span className="nx-whatsapp-icon" aria-hidden="true"><img src="https://cdn.simpleicons.org/whatsapp/FFFFFF" alt="" width="25" height="25" /></span><span><b>Need help?</b><small>Chat with us on WhatsApp</small></span><strong>→</strong></a>
  <MobileAppDownloadCTA/>
 </div>
}