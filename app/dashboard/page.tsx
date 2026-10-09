import Link from "next/link";
import TopBar from "@/components/TopBar";
import HomeLiveBoard from "@/components/HomeLiveBoard";
import MobileAppDownloadCTA from "@/components/MobileAppDownloadCTA";
import {getUser} from "@/lib/auth";
import {redirect} from "next/navigation";
export const dynamic="force-dynamic";
export default async function DashboardPage(){
 const user=await getUser().catch(()=>null);
 if(!user)redirect("/login");
 return <div className="reference-dashboard">
  <TopBar/>
  <section className="hero-card home-hero-refresh">
   <div className="hero-copy"><span className="eyebrow">NUMELIXA • LIVE</span><h1>Your global numbers, made simple.</h1><p>Choose a service, select a country, and manage your verification messages in one place.</p><Link className="primary-btn" href="/services">Get a number <span>→</span></Link></div>
   <div className="nx-earth-illustration" aria-hidden="true"><span className="nx-earth-globe"/><span className="nx-earth-orbit"/><span className="nx-earth-satellite"/></div>
  </section>
  <HomeLiveBoard/>
  <div className="quick-grid">
   <Link href="/services" className="quick-card"><span>＋</span><div><b>Get a number</b><small>Choose an app & country</small></div><i>→</i></Link>
   <Link href="/wallet" className="quick-card"><span>◈</span><div><b>Wallet</b><small>Check coins & top up</small></div><i>→</i></Link>
  </div>
  <div className="section-head"><div><span className="eyebrow">YOUR SPACE</span><h2>Everything in one place</h2></div></div>
  <div className="quick-grid">
   <Link href="/numbers" className="quick-card"><span>▣</span><div><b>My orders</b><small>Numbers and SMS status</small></div><i>→</i></Link>
   <Link href="/account" className="quick-card"><span>◉</span><div><b>Account</b><small>Profile and session</small></div><i>→</i></Link>
  </div>
  <MobileAppDownloadCTA/>
 </div>
}