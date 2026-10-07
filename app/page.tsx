import Link from "next/link";
import {getUser} from "@/lib/auth";
import {redirect} from "next/navigation";
import LivePhoneDemo from "@/components/LivePhoneDemo";

export const dynamic = "force-dynamic";

export default async function LandingPage() {
  const user = await getUser().catch(() => null);
  if (user) redirect("/dashboard");

  return (
    <div className="public-landing">
      <header className="landing-nav">
        <Link href="/" className="landing-brand"><span className="landing-logo">N</span><span><b>Numelixa</b><small>Virtual Numbers · Global SMS</small></span></Link>
        <nav><a href="#features">Features</a><a href="#how">How it works</a><a href="#security">Security</a></nav>
        <div className="landing-actions"><Link href="/login" className="landing-login">Sign in</Link><Link href="/signup" className="landing-start">Start now <span>→</span></Link></div>
      </header>

      <main>
        <section className="landing-hero">
          <div className="landing-copy">
            <div className="landing-badge"><span /> LIVE GLOBAL SMS PLATFORM</div>
            <h1>Virtual numbers.<br /><em>Built for speed.</em></h1>
            <p>Get a real virtual phone number for SMS verification, receive your code in seconds, and manage everything from one secure Numelixa account.</p>
            <div className="landing-cta"><Link href="/signup" className="landing-primary">Get started free <span>→</span></Link><Link href="/login" className="landing-secondary">Sign in</Link></div>
            <div className="landing-proof"><span>✓ Global coverage</span><span>✓ Live SMS</span><span>✓ Secure wallet</span></div>
          </div>
          <LivePhoneDemo />
        </section>

        <section className="landing-stats"><div><strong>Global</strong><span>Country coverage</span></div><div><strong>24/7</strong><span>Live availability</span></div><div><strong>Fast</strong><span>SMS delivery</span></div><div><strong>Secure</strong><span>Account protection</span></div></section>

        <section id="features" className="landing-section">
          <div className="landing-section-head"><span>WHY NUMELIXA</span><h2>Everything you need to verify.<br /><em>Nothing you don't.</em></h2></div>
          <div className="landing-feature-grid">
            <article><div>⚡</div><b>Live numbers</b><p>Pick a service and country from live availability and get your number without waiting.</p></article>
            <article><div>💬</div><b>Instant SMS</b><p>Watch your verification messages arrive in your Numelixa account and mobile app.</p></article>
            <article><div>🌍</div><b>Global coverage</b><p>Explore numbers across a wide range of countries and popular online services.</p></article>
            <article><div>🔐</div><b>Private by design</b><p>Your account, wallet, orders and verification history stay behind your secure login.</p></article>
          </div>
        </section>

        <section className="landing-live-strip" aria-label="Numelixa live activity">
          <div className="landing-live-panel">
            <span className="eyebrow">Live network</span>
            <h3>Numbers changing. Messages arriving.</h3>
            <p>A visual snapshot of the Numelixa experience, with fresh activity designed to feel like a live control room.</p>
            <div className="live-feed-list">
              <div className="live-feed-row"><b>🇺🇸 +1 ••• ••• 4198</b><span>SMS RECEIVED · 2s</span></div>
              <div className="live-feed-row"><b>🇬🇧 +44 •••• 123 681</b><span>NUMBER READY · NOW</span></div>
              <div className="live-feed-row"><b>🇩🇪 +49 ••• ••• 276</b><span>CODE DELIVERED · NOW</span></div>
            </div>
          </div>
          <div className="landing-video-panel">
            <span className="eyebrow">Product preview</span>
            <div className="video-screen"><span className="video-live">LIVE PREVIEW</span></div>
            <h3>See it in motion.</h3>
            <p>Fast number selection, live SMS status and a clean verification workflow.</p>
          </div>
          <div className="landing-people-panel">
            <span className="eyebrow">Loved worldwide</span>
            <h3>Built for people who need speed.</h3>
            <p>Use a polished workspace across web and Android, wherever you work.</p>
            <div className="people-row">
              <div className="person">A</div><div className="person">M</div><div className="person">S</div><div className="person">J</div>
              <span><b>Global users</b><small>Secure verification, simplified.</small></span>
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

        <section className="landing-final"><span>READY WHEN YOU ARE</span><h2>Start with Numelixa today.</h2><p>Get your first virtual number in a few taps.</p><Link href="/signup" className="landing-primary">Create free account <span>→</span></Link></section>
      </main>

      <footer className="landing-footer"><span>© 2026 Numelixa</span><div><Link href="/rules">Rules</Link><Link href="/faq">FAQ</Link><Link href="/terms">Terms</Link><Link href="/privacy">Privacy</Link><Link href="/developers">Developers</Link></div></footer>
    </div>
  );
}
