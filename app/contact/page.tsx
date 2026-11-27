import Link from "next/link";
import PublicFooter from "@/components/PublicFooter";

export const metadata = {
  title: "Contact Numelixa | Customer Support",
  description: "Contact the Numelixa team for help with your account, orders, wallet or platform access.",
};

export default function ContactPage() {
  return (
    <main className="nx-guide-page">
      <header className="nx-guide-nav">
        <Link href="/" className="nx-guide-brand">
          <img src="/numelixa-app-icon.webp" alt="" width="34" height="34" />
          NUMELIXA
        </Link>
        <nav>
          <Link href="/about">About</Link>
          <Link href="/support">Support</Link>
        </nav>
      </header>
      <section className="nx-guide-hero">
        <span className="nx-guide-kicker">CONTACT NUMELIXA</span>
        <h1>Talk to the Numelixa team.</h1>
        <p>
          For help with your account, orders, wallet or platform access, reach
          out through the official Numelixa support channels.
        </p>
      </section>
      <section className="nx-legal-index">
        <a href="mailto:support@numelixa.com">
          <span className="nx-legal-index-icon">✉</span>
          <span><b>Email Support</b><small>support@numelixa.com</small></span>
          <i>↗</i>
        </a>
        <Link href="/support">
          <span className="nx-legal-index-icon">?</span>
          <span><b>Support Center</b><small>Submit and track a support request</small></span>
          <i>→</i>
        </Link>
      </section>
      <section className="nx-guide-bottom nx-contact-parent">
        <div>
          <span className="nx-guide-kicker">CORPORATE INFORMATION</span>
          <h2>Part of the Tavort group.</h2>
          <p>
            Tavort is the parent technology company. Numelixa is one of its
            products and maintains its own customer-facing identity, services
            and support experience.
          </p>
          <Link href="/about">Learn about Numelixa →</Link>
        </div>
      </section>
      <PublicFooter />
      <style jsx>{`
        .nx-contact-parent { margin-top: 34px; }
        .nx-contact-parent p { max-width: 650px; }
        .nx-contact-parent :global(a) { display: inline-block; margin-top: 10px; color: #2689bd; font-size: 13px; font-weight: 750; }
      `}</style>
    </main>
  );
}
