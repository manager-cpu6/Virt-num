import Link from "next/link";
import TopBar from "@/components/TopBar";
import {getUser} from "@/lib/auth";
import {redirect} from "next/navigation";
export const dynamic="force-dynamic";
export default async function DashboardPage(){
 const user=await getUser().catch(()=>null);
 if(!user)redirect("/login");
 const name=String(user.name||"there").trim().split(/\s+/)[0]||"there";
 const coins=Number(user.coins||0);
 return <div className="reference-dashboard">
  <TopBar/>
  <section className="hero-card home-hero-refresh nx-dashboard-hero">
   <div className="hero-copy"><span className="eyebrow">NUMELIXA · YOUR ACCOUNT</span><h1>Hello, {name}.</h1><p>Virtual Numbers, Real Freedom. Manage your numbers, SMS and wallet in one simple place.</p><Link className="primary-btn" href="/services">Buy a number <span>→</span></Link></div>
   <div className="hero-orb" aria-hidden="true">✦</div>
  </section>
  <section className="nx-balance-card"><div><span>AVAILABLE BALANCE</span><strong>{coins.toLocaleString()} <small>coins</small></strong><p>Your current account balance</p></div><Link href="/wallet">Add funds <span>＋</span></Link></section>
  <div className="section-head"><div><span className="eyebrow">QUICK ACTIONS</span><h2>What would you like to do?</h2></div></div>
  <div className="quick-grid nx-shortcuts">
   <Link href="/services" className="quick-card"><span>＋</span><div><b>Buy Number</b><small>Choose a service</small></div><i>→</i></Link>
   <Link href="/numbers" className="quick-card"><span>▣</span><div><b>My Numbers</b><small>View your orders</small></div><i>→</i></Link>
   <Link href="/countries" className="quick-card"><span>🌐</span><div><b>Servers</b><small>Browse countries</small></div><i>→</i></Link>
   <Link href="/wallet" className="quick-card"><span>◈</span><div><b>Wallet</b><small>Balance and payments</small></div><i>→</i></Link>
  </div>
  <section className="nx-recent-activity"><div className="section-head"><div><span className="eyebrow">YOUR ACCOUNT</span><h2>Recent activity</h2></div><Link href="/numbers" className="text-link">View orders →</Link></div><div className="nx-empty-activity"><span>◷</span><b>Your activity lives here</b><p>Open My Numbers to see the latest real order statuses and SMS updates.</p><Link href="/numbers">View My Numbers</Link></div></section>
 </div>
}
