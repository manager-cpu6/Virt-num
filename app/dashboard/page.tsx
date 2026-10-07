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

  <section className="hero-card home-hero-refresh">
   <div className="hero-copy">
    <span className="eyebrow">NUMELIXA • GLOBAL NETWORK</span>
    <h1>Your verification workspace, redesigned for speed.</h1>
    <p>Choose a service, select a country and get a live number in a few taps. SMS, orders, wallet and account tools are now organized around the things you use most.</p>
    <div className="home-command-actions">
     <Link className="solid" href="/services">Get a number <span>→</span></Link>
     <Link className="ghost" href="/numbers">View my orders</Link>
    </div>
   </div>
   <div className="hero-orb" aria-hidden="true"><span>✦</span></div>
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
