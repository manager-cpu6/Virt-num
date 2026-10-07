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

 return <div className="dashboard-command-center">
  <TopBar/>

  <section className="hero-card home-hero-refresh virtual-hero">
   <div className="hero-copy">
    <div className="virtual-badge"><span className="virtual-dot"/> NUMELIXA VIRTUAL NETWORK <span>LIVE</span></div>
    <h1>Virtual numbers.<br/><em>Real SMS.</em></h1>
    <p>Buy a virtual phone number for verification, watch the SMS arrive live, and manage everything from one secure workspace.</p>
    <div className="home-command-actions">
     <Link className="solid" href="/services">Get a virtual number <span>→</span></Link>
     <Link className="ghost" href="/numbers">My numbers</Link>
    </div>
    <div className="virtual-trust"><span>⚡ Instant activation</span><span>◉ Live SMS</span><span>🔒 Secure wallet</span></div>
   </div>
   <div className="virtual-phone" aria-hidden="true">
    <div className="virtual-phone-speaker"/>
    <div className="virtual-phone-screen">
      <div className="phone-status"><span>NUMELIXA</span><b>● LIVE</b></div>
      <div className="phone-network">VIRTUAL NUMBER</div>
      <div className="phone-number">+1 202 ••• •481</div>
      <div className="phone-sms"><small>INCOMING SMS</small><strong>Your verification code</strong><b>482 913</b><span>Just now · Secure</span></div>
    </div>
   </div>
  </section>

  <div className="home-command-grid" aria-label="Quick actions">
   <section className="home-command-card dark">
    <span className="kicker">SMART START</span>
    <h3>One place for every verification.</h3>
    <p>Jump directly to live numbers, your current orders, or your wallet without searching through menus.</p>
    <div className="home-command-actions">
     <Link className="solid" href="/services">Browse numbers →</Link>
     <Link className="ghost" href="/wallet">Open wallet</Link>
    </div>
   </section>
   <section className="home-command-card">
    <span className="kicker">YOUR ACCOUNT</span>
    <h3>Everything stays together.</h3>
    <p>Manage active orders, account security, sessions and your developer tools from one account.</p>
    <div className="home-command-actions">
     <Link className="ghost" href="/account">Account settings</Link>
    </div>
   </section>
  </div>

  <div className="home-trust-row">
   <div className="home-trust-item"><b>⚡ Fast flow</b><small>Fewer steps from service to number</small></div>
   <div className="home-trust-item"><b>◉ Live network</b><small>Availability refreshes automatically</small></div>
   <div className="home-trust-item"><b>🔒 Protected</b><small>Account and wallet behind your login</small></div>
  </div>

  <HomeLiveBoard/>
  <MobileAppDownloadCTA/>
 </div>
}
