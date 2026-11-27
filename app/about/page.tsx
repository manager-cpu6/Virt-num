import Link from "next/link";
import PublicFooter from "@/components/PublicFooter";

export const metadata = {
  title: "About Numelixa | Global Virtual Numbers",
  description:
    "Learn about Numelixa, a digital platform for virtual numbers, SMS verification and simple, reliable account management.",
};

const principles = [
  {
    number: "01",
    title: "Straightforward access",
    body: "Find supported services, choose an available country and manage your activations from one clear account.",
  },
  {
    number: "02",
    title: "A connected experience",
    body: "Keep numbers, verification messages, orders and wallet activity together in one consistent workspace.",
  },
  {
    number: "03",
    title: "Support that stays close",
    body: "Get help with your account, payments and orders through Numelixa’s support channels.",
  },
];

export default function AboutPage() {
  return (
    <main className="nx-guide-page nx-about-page">
      <header className="nx-guide-nav">
        <Link href="/" className="nx-guide-brand">
          <img src="/numelixa-app-icon.webp" alt="" width="34" height="34" />
          NUMELIXA
        </Link>
        <nav>
          <Link href="/support">Support</Link>
          <Link href="/contact">Contact</Link>
        </nav>
      </header>

      <section className="nx-about-hero">
        <div className="nx-about-hero-copy">
          <span className="nx-guide-kicker">ABOUT NUMELIXA</span>
          <h1>Global access.<br /><span>Simpler connections.</span></h1>
          <p>
            Numelixa is a digital platform for virtual phone numbers and SMS
            verification. We bring supported services, number activations,
            messages, orders and account tools into one straightforward
            experience.
          </p>
          <div className="nx-about-actions">
            <Link href="/services" className="nx-guide-primary">Explore numbers <span aria-hidden="true">→</span></Link>
            <Link href="/support" className="nx-about-secondary">Visit support</Link>
          </div>
        </div>
        <div className="nx-about-orbit" aria-hidden="true">
          <div className="nx-about-orbit-ring nx-about-orbit-ring-one" />
          <div className="nx-about-orbit-ring nx-about-orbit-ring-two" />
          <div className="nx-about-globe"><span> N </span></div>
          <i className="nx-about-orbit-dot nx-about-dot-one" />
          <i className="nx-about-orbit-dot nx-about-dot-two" />
          <i className="nx-about-orbit-dot nx-about-dot-three" />
        </div>
      </section>

      <section className="nx-about-intro">
        <div>
          <span className="nx-guide-kicker">OUR PURPOSE</span>
          <h2>Make digital verification easier to manage.</h2>
        </div>
        <p>
          We believe essential digital services should feel clear and
          manageable. Numelixa is built to help individuals, businesses and
          developers access supported virtual-number services, follow each
          activation and understand their account activity without unnecessary
          complexity.
        </p>
      </section>

      <section className="nx-about-principles">
        <div className="nx-about-section-heading">
          <span className="nx-guide-kicker">THE NUMELIXA EXPERIENCE</span>
          <h2>Designed around what matters.</h2>
        </div>
        <div className="nx-about-principle-grid">
          {principles.map((item) => (
            <article className="nx-about-principle" key={item.number}>
              <span>{item.number}</span>
              <h3>{item.title}</h3>
              <p>{item.body}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="nx-about-story">
        <div className="nx-about-story-mark" aria-hidden="true">N</div>
        <div>
          <span className="nx-guide-kicker">BUILT FOR EVERYDAY USE</span>
          <h2>One place to manage the journey.</h2>
          <p>
            From selecting a service and checking availability to receiving a
            verification message and reviewing an order, Numelixa keeps the
            important steps connected. We continue to refine the platform with
            a focus on usability, dependable service and clear customer
            information.
          </p>
        </div>
      </section>

      <section className="nx-about-cta">
        <div>
          <span className="nx-guide-kicker">HERE TO HELP</span>
          <h2>Need a hand with Numelixa?</h2>
          <p>Our support team can help with your account, orders, wallet and platform access.</p>
        </div>
        <Link href="/contact" className="nx-guide-primary">Contact our team <span aria-hidden="true">→</span></Link>
      </section>

      <section className="nx-about-parent" aria-label="Corporate structure">
        <span className="nx-about-parent-label">CORPORATE STRUCTURE</span>
        <p><strong>Numelixa</strong> is part of the <strong>Tavort</strong> group.</p>
        <small>
          Tavort is the parent technology company. Numelixa operates as its own
          customer-facing product and brand.
        </small>
      </section>

      <PublicFooter />

      <style jsx>{`
        .nx-about-page { overflow: hidden; }
        .nx-about-hero { position: relative; isolation: isolate; display: grid; grid-template-columns: minmax(0,1.05fr) minmax(280px,.95fr); align-items: center; gap: 28px; min-height: 430px; padding: clamp(28px,5vw,58px); margin: 18px auto 0; border: 1px solid rgba(120,150,220,.22); border-radius: 30px; color: #f7f9ff; background: radial-gradient(ellipse at 76% 42%,rgba(34,116,255,.25),transparent 40%), linear-gradient(125deg,#071126,#0b1731 58%,#101d42); box-shadow: 0 28px 80px rgba(4,13,35,.18); }
        .nx-about-hero-copy { position: relative; z-index: 2; max-width: 620px; }
        .nx-about-hero :global(.nx-guide-kicker) { color: #65d9f3; }
        .nx-about-hero h1 { margin: 16px 0; font-size: clamp(42px,6.4vw,72px); line-height: .98; letter-spacing: -.065em; }
        .nx-about-hero h1 span { color: #66d7f0; }
        .nx-about-hero p { max-width: 570px; color: #c2cce0; font-size: 15px; line-height: 1.75; }
        .nx-about-actions { display: flex; flex-wrap: wrap; align-items: center; gap: 12px; margin-top: 25px; }
        .nx-about-actions :global(.nx-guide-primary), .nx-about-cta :global(.nx-guide-primary) { display: inline-flex; align-items: center; gap: 12px; }
        .nx-about-secondary { padding: 13px 17px; border: 1px solid rgba(204,222,255,.32); border-radius: 999px; color: #e5edff; font-size: 13px; font-weight: 700; }
        .nx-about-orbit { position: relative; width: min(100%,390px); aspect-ratio: 1; justify-self: center; display: grid; place-items: center; }
        .nx-about-globe { position: relative; z-index: 1; width: 48%; aspect-ratio: 1; display: grid; place-items: center; border: 1px solid rgba(133,221,255,.8); border-radius: 50%; color: #fff; font-size: clamp(50px,8vw,88px); font-weight: 900; background: radial-gradient(circle at 35% 28%,#5be5ff 0,#2476e9 25%,#112d70 65%,#07132e 100%); box-shadow: 0 0 55px rgba(42,164,255,.38), inset -18px -22px 40px rgba(0,0,0,.4), inset 8px 8px 25px rgba(255,255,255,.25); }
        .nx-about-globe span { text-shadow: 0 4px 24px rgba(0,0,0,.35); }
        .nx-about-orbit-ring { position: absolute; width: 90%; height: 37%; border: 1px solid rgba(80,191,255,.65); border-radius: 50%; transform: rotate(-28deg); box-shadow: 0 0 20px rgba(37,145,255,.12); }
        .nx-about-orbit-ring-two { width: 105%; height: 52%; transform: rotate(48deg); border-color: rgba(107,126,255,.48); }
        .nx-about-orbit-dot { position: absolute; z-index: 2; width: 9px; height: 9px; border-radius: 50%; background: #8ceaff; box-shadow: 0 0 18px 5px rgba(76,190,255,.65); }
        .nx-about-dot-one { top: 20%; left: 23%; }.nx-about-dot-two { right: 13%; top: 43%; }.nx-about-dot-three { bottom: 17%; left: 47%; }
        .nx-about-intro { display: grid; grid-template-columns: .85fr 1.15fr; gap: 42px; padding: 76px 5% 58px; align-items: start; }
        .nx-about-intro h2,.nx-about-section-heading h2,.nx-about-story h2,.nx-about-cta h2 { margin: 12px 0 0; color: #111827; font-size: clamp(27px,3.5vw,39px); line-height: 1.1; letter-spacing: -.05em; }
        .nx-about-intro p,.nx-about-story p,.nx-about-cta p { margin: 0; color: #606b7d; line-height: 1.8; font-size: 14px; }
        .nx-about-principles { padding: 45px 5% 65px; border-top: 1px solid rgba(40,55,85,.1); border-bottom: 1px solid rgba(40,55,85,.1); background: rgba(255,255,255,.36); }
        .nx-about-principle-grid { display: grid; grid-template-columns: repeat(3,minmax(0,1fr)); gap: 14px; margin-top: 26px; }
        .nx-about-principle { min-height: 190px; padding: 23px; border: 1px solid rgba(80,100,140,.13); border-radius: 21px; background: rgba(255,255,255,.72); box-shadow: 0 12px 35px rgba(25,40,70,.05); }
        .nx-about-principle > span { color: #1b9ac8; font-size: 11px; font-weight: 900; letter-spacing: .13em; }
        .nx-about-principle h3 { margin: 22px 0 9px; color: #172033; font-size: 17px; letter-spacing: -.025em; }
        .nx-about-principle p { margin: 0; color: #667085; font-size: 13px; line-height: 1.7; }
        .nx-about-story { display: grid; grid-template-columns: 100px 1fr; gap: 28px; align-items: center; padding: 70px 7%; }
        .nx-about-story-mark { width: 84px; height: 84px; display: grid; place-items: center; border-radius: 26px; color: #dffbff; font-size: 42px; font-weight: 900; background: linear-gradient(145deg,#0d9ed1,#344be5 72%,#7149dc); box-shadow: 0 15px 35px rgba(39,105,205,.2); }
        .nx-about-story p { margin-top: 14px; max-width: 760px; }
        .nx-about-cta { display: flex; align-items: center; justify-content: space-between; gap: 24px; margin: 0 3% 48px; padding: 30px 34px; border: 1px solid rgba(60,115,205,.16); border-radius: 24px; background: linear-gradient(115deg,rgba(224,242,255,.78),rgba(245,241,255,.76)); }
        .nx-about-cta p { margin-top: 9px; }
        .nx-about-parent { padding: 23px 18px 28px; text-align: center; border-top: 1px solid rgba(40,55,85,.1); }
        .nx-about-parent-label { color: #8a94a7; font-size: 9px; font-weight: 850; letter-spacing: .18em; }
        .nx-about-parent p { margin: 9px 0 4px; color: #687386; font-size: 13px; }
        .nx-about-parent p strong:first-child { color: #34445f; }
        .nx-about-parent p strong:last-child { color: #687386; font-weight: 750; }
        .nx-about-parent small { display: block; color: #929bad; font-size: 11px; line-height: 1.6; }
        @media(max-width:760px) { .nx-about-hero { grid-template-columns: 1fr; padding: 30px 24px 18px; }.nx-about-orbit { width: min(82%,300px); }.nx-about-intro { grid-template-columns: 1fr; gap: 16px; padding: 52px 5% 42px; }.nx-about-principle-grid { grid-template-columns: 1fr; }.nx-about-principle { min-height: auto; }.nx-about-story { grid-template-columns: 1fr; gap: 18px; padding: 48px 6%; }.nx-about-cta { align-items: flex-start; flex-direction: column; padding: 26px; } }
      `}</style>
    </main>
  );
}
