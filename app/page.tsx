import Link from "next/link";
import PublicFooter from "@/components/PublicFooter";
import {getUser} from "@/lib/auth";
import {redirect} from "next/navigation";
import {headers} from "next/headers";
import FirstPartyCheckout from "@/components/FirstPartyCheckout";
import CryptoPaymentPage from "@/components/CryptoPaymentPage";
import LivePhoneDemo from "@/components/LivePhoneDemo";
import AndroidDownloadPage from "@/components/AndroidDownloadPage";
import type {Metadata} from "next";

export const dynamic = "force-dynamic";

export async function generateMetadata():Promise<Metadata>{
 const host=(await headers()).get("host")?.split(":")[0].toLowerCase()||"";
 if(host==="app.numelixa.com")return {
  metadataBase:new URL("https://app.numelixa.com"),
  title:{absolute:"Numelixa APK Download | Official Numelixa Android App"},
  description:"Download the official Numelixa APK for Android. Get the Numelixa app to manage virtual numbers, SMS verification, wallet, orders and notifications. Safe, direct APK download from app.numelixa.com.",
  keywords:["Numelixa APK","APK Numelixa","Numelixa app","app Numelixa","Numelixa Android app","download Numelixa APK","Numelixa download","Numelixa mobile app","Numelixa Android"],
  alternates:{canonical:"https://app.numelixa.com/"},
  robots:{index:true,follow:true,googleBot:{index:true,follow:true}},
  openGraph:{type:"website",url:"https://app.numelixa.com/",siteName:"Numelixa",title:"Numelixa APK Download | Official Android App",description:"Get the official Numelixa Android app for virtual numbers, SMS, wallet and order updates.",images:[{url:"https://numelixa.com/numelixa-favicon.png",width:512,height:512,alt:"Numelixa Android app icon"}]},
  twitter:{card:"summary_large_image",title:"Numelixa APK Download | Official Android App",description:"Download the official Numelixa Android app.",images:["https://numelixa.com/numelixa-favicon.png"]},
  icons:{icon:"https://numelixa.com/numelixa-brand.svg",apple:"https://numelixa.com/numelixa-favicon.png"}
 };
 return {};
}

export default async function LandingPage() {
 const host=(await headers()).get("host")?.split(":")[0].toLowerCase()||"";
 if(host==="app.numelixa.com")return <AndroidDownloadPage/>;
 if(host==="checkout.numelixa.com")return <FirstPartyCheckout/>;
 if(host==="payment.numelixa.com")return <CryptoPaymentPage/>;
 const user=await getUser().catch(()=>null);
 if(user)redirect("/dashboard");

 return <div className="public-landing nx-landing-v2">
  <header className="landing-nav">
   <Link href="/" className="landing-brand"><span className="landing-logo"><img src="/numelixa-brand.svg" alt=""/></span><span><b>Numelixa</b><small>Virtual Numbers · Global SMS</small></span></Link>
   <nav aria-label="Main navigation"><a href="#features">Platform</a><a href="#how">How it works</a><Link href="/services">Services</Link><Link href="/pricing">Pricing</Link><Link href="/developers/docs">Developers</Link><Link href="/support">Support</Link></nav>
   <div className="landing-actions"><Link href="/login" className="landing-login">Sign in</Link><Link href="/signup" className="landing-start">Get started <span>↗</span></Link></div>
  </header>

  <main>
   <section className="landing-hero nx-hero-v2">
    <div className="landing-copy">
     <div className="landing-badge"><span/> VIRTUAL NUMBERS · GLOBAL SMS</div>
     <h1>Numbers,<br/><em>without the noise.</em></h1>
     <p>Get a virtual number for supported services. Follow incoming verification messages and manage your numbers in one secure workspace.</p>
     <div className="landing-cta"><Link href="/signup" className="landing-primary">Get a Number <span>↗</span></Link><Link href="/login" className="landing-secondary">Sign in to your account</Link></div>
     <div className="landing-proof"><span><i/> Service availability by country</span><span><i/> Order and SMS tracking</span><span><i/> Web and Android</span></div>
    </div>
    <LivePhoneDemo/>
   </section>

   <section className="landing-stats nx-value-row" aria-label="Platform overview">
    <div><strong>Service catalog</strong><span>Browse supported services and countries</span></div>
    <div><strong>SMS inbox</strong><span>Keep activation messages with each order</span></div>
    <div><strong>One workspace</strong><span>Numbers, wallet and order history</span></div>
   </section>

   <section id="features" className="landing-section nx-section-v2">
    <div className="landing-section-head"><span>THE NUMELIXA WORKSPACE</span><h2>Everything in reach.<br/><em>Nothing in the way.</em></h2><p>One clear workflow from choosing a service to checking its verification status.</p></div>
    <div className="landing-feature-grid">
     <article><div>⌕</div><b>Explore services</b><p>Find supported platforms and review country availability before placing an order.</p></article>
     <article><div>↗</div><b>Choose with clarity</b><p>See the available options and displayed price before confirming your selection.</p></article>
     <article><div>▤</div><b>Follow incoming SMS</b><p>Keep verification messages and order status together in your workspace.</p></article>
     <article><div>◈</div><b>Stay in control</b><p>Manage your wallet, orders, account settings and support from one place.</p></article>
    </div>
   </section>

   <section className="nx-product-band">
    <div className="nx-product-band-copy"><span className="nx-section-kicker">A CLEARER WAY TO VERIFY</span><h2>From service selection<br/><em>to SMS received.</em></h2><p>Choose a supported service, select an available country and follow the activation from your Numelixa account.</p><Link href="/services" className="nx-text-link">Explore services <b>↗</b></Link></div>
    <div className="nx-product-steps">
     <article><span>01</span><div><b>Browse the catalog</b><p>Compare supported services and country options.</p></div><i>⌕</i></article>
     <article><span>02</span><div><b>Place your order</b><p>Review the displayed price and confirm with your wallet.</p></div><i>＋</i></article>
     <article><span>03</span><div><b>Check your inbox</b><p>See the message and verification status for your order.</p></div><i>✓</i></article>
    </div>
   </section>

   <section id="how" className="landing-how nx-section-v2">
    <div className="landing-section-head"><span>HOW IT WORKS</span><h2>A focused workflow,<br/><em>in three steps.</em></h2></div>
    <div className="landing-steps">
     <article><span>01</span><div><b>Create your account</b><p>Sign up with an available account method and complete the verification steps.</p></div></article>
     <article><span>02</span><div><b>Choose a number</b><p>Select a supported service and country, then review the price before ordering.</p></div></article>
     <article><span>03</span><div><b>Receive your code</b><p>Follow the order and check its inbox when a verification message arrives.</p></div></article>
    </div>
   </section>

   <section id="security" className="landing-security nx-security-v2">
    <div><span className="landing-badge">BUILT AROUND CONTROL</span><h2>Your verification workspace,<br/><em>all in one place.</em></h2><p>Keep your numbers, messages, wallet and account controls together across the Numelixa website and Android app.</p><Link href="/signup" className="landing-primary">Create your account <span>↗</span></Link></div>
    <div className="security-panel">
     <div><b>⌑</b><span><strong>Account sessions</strong><small>Review your active devices</small></span><i>✓</i></div>
     <div><b>◈</b><span><strong>Wallet activity</strong><small>Keep track of account movements</small></span><i>✓</i></div>
     <div><b>⌁</b><span><strong>Order notifications</strong><small>Stay informed about order updates</small></span><i>✓</i></div>
    </div>
   </section>

   <section className="landing-final nx-final-v2"><span>YOUR NEXT STEP</span><h2>Make verification simpler.</h2><p>Explore the Numelixa catalog and choose the workflow that fits your needs.</p><div><Link href="/signup" className="landing-primary">Get started <span>↗</span></Link><Link href="/services" className="nx-final-link">Browse services</Link></div></section>
  </main>
  <PublicFooter/>
 </div>;
}
