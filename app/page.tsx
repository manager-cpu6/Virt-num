import Link from "next/link";
import TopBar from "@/components/TopBar";
export default function HomePage(){
 return <div>
  <TopBar/>
  <section className="hero-card">
   <div className="hero-copy">
    <span className="eyebrow">NUMELIXA • LIVE</span>
    <h1>Numbers, without the noise.</h1>
    <p>Choose a service, pick a country and get a live SMS number in a few taps. Your wallet, orders and codes stay in one clean place.</p>
    <Link className="primary-btn" href="/services">Get a number <span>→</span></Link>
   </div>
   <div className="hero-orb"><span>✦</span></div>
  </section>
  <div className="quick-grid">
   <Link href="/services" className="quick-card"><span>＋</span><div><b>Get a number</b><small>Choose an app & country</small></div><i>→</i></Link>
   <Link href="/wallet" className="quick-card"><span>◈</span><div><b>Wallet</b><small>Check coins & top up</small></div><i>→</i></Link>
  </div>
  <div className="section-head"><div><span className="eyebrow">YOUR SPACE</span><h2>Everything in one place</h2></div></div>
  <div className="quick-grid">
   <Link href="/numbers" className="quick-card"><span>▣</span><div><b>My orders</b><small>Numbers and SMS status</small></div><i>→</i></Link>
   <Link href="/account" className="quick-card"><span>◉</span><div><b>Account</b><small>Profile and session</small></div><i>→</i></Link>
  </div>
 </div>
}