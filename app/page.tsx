import Link from "next/link";
import PublicFooter from "@/components/PublicFooter";
import {getUser} from "@/lib/auth";
import {redirect} from "next/navigation";
import {headers} from "next/headers";
import FirstPartyCheckout from "@/components/FirstPartyCheckout";
import CryptoPaymentPage from "@/components/CryptoPaymentPage";
import LivePhoneDemo from "@/components/LivePhoneDemo";
import AndroidDownloadPage from "@/components/AndroidDownloadPage";
import EthiopiaPaymentCheckout from "@/components/EthiopiaPaymentCheckout";
import SecureCardCheckout from "@/components/SecureCardCheckout";
import type {Metadata} from "next";

export const dynamic = "force-dynamic";

export async function generateMetadata():Promise<Metadata>{
 const host=(await headers()).get("host")?.split(":")[0].toLowerCase()||"";
 if(host==="ethio.virtunumber.online")return {metadataBase:new URL("https://ethio.virtunumber.online"),title:"Ethiopia Payment | Numelixa",description:"Secure Ethiopian mobile wallet and bank payments for Numelixa.",robots:{index:false,follow:false},icons:{icon:"https://www.numelixa.com/numelixa-app-icon.webp"}};
 if(host==="app.numelixa.com")return {
  metadataBase:new URL("https://app.numelixa.com"),
  title:{absolute:"Numelixa APK Download | Official Numelixa Android App"},
  description:"Download the official Numelixa APK for Android. Get the Numelixa app to manage virtual numbers, SMS verification, wallet, orders and notifications. Safe, direct APK download from app.numelixa.com.",
  keywords:["Numelixa APK","APK Numelixa","Numelixa app","app Numelixa","Numelixa Android app","download Numelixa APK","Numelixa download","Numelixa mobile app","Numelixa Android"],
  alternates:{canonical:"https://app.numelixa.com/"},
  robots:{index:true,follow:true,googleBot:{index:true,follow:true}},
  openGraph:{type:"website",url:"https://app.numelixa.com/",siteName:"Numelixa",title:"Numelixa APK Download | Official Android App",description:"Get the official Numelixa Android app for virtual numbers, SMS, wallet and order updates.",images:[{url:"https://numelixa.com/numelixa-favicon.png",width:512,height:512,alt:"Numelixa Android app icon"}]},
  twitter:{card:"summary_large_image",title:"Numelixa APK Download | Official Android App",description:"Download the official Numelixa Android app.",images:["https://numelixa.com/numelixa-favicon.png"]},
  icons:{icon:"https://numelixa.com/numelixa-app-icon.webp",apple:"https://numelixa.com/numelixa-favicon.png"}
 };
 return {};
}

export default async function LandingPage() {
  const host=(await headers()).get("host")?.split(":")[0].toLowerCase()||"";
  if(host==="app.numelixa.com")return <AndroidDownloadPage/>;
  if(host==="checkout.numelixa.com")return <FirstPartyCheckout/>;
  if(host==="payment.numelixa.com")return <CryptoPaymentPage/>;
  if(host==="ethio.virtunumber.online")return <EthiopiaPaymentCheckout/>;
  if(host==="secure.payment.numelixa.com")return <SecureCardCheckout/>;
  const user = await getUser().catch(() => null);
  if (user) redirect("/dashboard");

  return (
    <div className="public-landing">
      <header className="landing-nav">
        <Link href="/" className="landing-brand"><span className="landing-logo"><img src="/numelixa-app-icon.webp" alt=""/></span><span><b>Numelixa</b><small>Virtual Numbers · Global SMS</small></span></Link>
        <nav><a href="#features">Platform</a><a href="#how">How it works</a><Link href="/services">Services</Link><Link href="/pricing">Pricing</Link><Link href="/developers/docs">Developers</Link><Link href="/support">Support</Link></nav>
        <div className="landing-actions"><Link href="/login" className="landing-login">Sign in</Link><Link href="/signup" className="landing-start">Start now <span>→</span></Link></div>
      </header>

      <main>
        <section className="landing-hero">
          <div className="landing-copy">
            <div className="landing-badge"><span /> LIVE GLOBAL SMS PLATFORM</div>
            <h1>Numbers, without the noise.</h1>
            <p>Get a virtual number for supported services, manage your numbers and keep everything in one place.</p>
            <div className="landing-cta"><Link href="/signup" className="landing-primary">Get a Number <span>→</span></Link><Link href="/login" className="landing-secondary">Sign in</Link></div>
            <div className="landing-proof"><span>✓ Live service catalog</span><span>✓ Order & SMS tracking</span><span>✓ USD wallet</span></div>
          </div>
          <LivePhoneDemo />
        </section>

        <section className="landing-stats"><div><strong>Live catalog</strong><span>Browse services and country availability</span></div><div><strong>One workspace</strong><span>Numbers, orders, SMS and wallet</span></div><div><strong>Since 2023</strong><span>Building virtual-number services from 2023 through 2026</span></div></section>

        <section id="features" className="landing-section">
          <div className="landing-section-head"><span>WHY NUMELIXA</span><h2>Everything you need to verify.<br /><em>Nothing you don't.</em></h2></div>
          <div className="landing-feature-grid">
            <article><div>↗</div><b>Live availability</b><p>Choose a service and check country stock and price before placing an order.</p></article>
            <article><div>SMS</div><b>SMS tracking</b><p>Follow activation status and view incoming verification messages in your account.</p></article>
            <article><div>◎</div><b>Country selection</b><p>Explore the countries returned by the live catalog for the service you select.</p></article>
            <article><div>⌑</div><b>Account controls</b><p>Manage your profile, sessions, wallet, orders and support from one account.</p></article>
          </div>
        </section>

        <section className="landing-live-strip" aria-label="Numelixa live activity">
          <div className="landing-live-panel">
            <span className="eyebrow">Live network</span>
            <h3>Your numbers and messages, in one place.</h3>
            <p>A preview of the workflow. Your real orders and incoming messages appear after sign-in.</p>
            <div className="live-feed-list"><div className="live-feed-row"><b>Real order activity</b><span>AVAILABLE AFTER SIGN-IN</span></div></div>
          </div>
          <div className="landing-video-panel">
            <span className="eyebrow">Product preview</span>
            <div className="video-screen"><span className="video-live">APP PREVIEW</span></div>
            <h3>See it in motion.</h3>
            <p>Fast number selection, live SMS status and a clean verification workflow.</p>
          </div>
          <div className="landing-people-panel">
            <span className="eyebrow">ONE ACCOUNT</span>
            <h3>Your workflow stays together.</h3>
            <p>Move between the website and native Android app while keeping your Numelixa account and order history in one place.</p>
            <div className="people-row">
              <span><b>Product access</b><small>Web dashboard · Native Android app</small></span>
            </div>
          </div>
        </section>

        <section id="how" className="landing-how">
          <div className="landing-section-head"><span>HOW IT WORKS</span><h2>From sign up to code<br /><em>in three simple steps.</em></h2></div>
          <div className="landing-steps">
            <article><span>01</span><div><b>Create your account</b><p>Sign up with email or phone. Verify your account with a secure one-time code.</p></div></article>
            <article><span>02</span><div><b>Choose a number</b><p>Select your service and country, then use your balance to get a live number.</p></div></article>
            <article><span>03</span><div><b>Receive your code</b><p>Keep the order open and your SMS verification code appears when it arrives.</p></div></article>
          </div>
        </section>

        <section id="security" className="landing-security">
          <div><span className="landing-badge">BUILT FOR TRUST</span><h2>Your verification workspace,<br /><em>all in one place.</em></h2><p>Numelixa combines numbers, SMS, wallet, orders and account security into one clean experience across web and Android.</p><Link href="/signup" className="landing-primary">Start now <span>→</span></Link></div>
          <div className="security-panel">
            <div><b>🔒</b><span><strong>Secure sessions</strong><small>Manage your active devices</small></span><i>✓</i></div>
            <div><b>◈</b><span><strong>Wallet control</strong><small>Track every credit movement</small></span><i>✓</i></div>
            <div><b>🔔</b><span><strong>Native alerts</strong><small>Stay informed on Android</small></span><i>✓</i></div>
          </div>
        </section>

        <section className="landing-final"><span>ESTABLISHED 2023 · SERVING THROUGH 2026</span><h2>Start with Numelixa today.</h2><p>Get your first virtual number in a few taps.</p><Link href="/signup" className="landing-primary">Create free account <span>→</span></Link></section>
      </main>

      <PublicFooter/>
    </div>
  );
}
