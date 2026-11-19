import PricingExplorer from "@/components/PricingExplorer";
import PublicFooter from "@/components/PublicFooter";
export const dynamic="force-dynamic";
export default function PricingPage(){return <main className="nx-public-page"><header className="nx-public-nav"><a href="/" className="nx-public-brand">NUMELIXA</a><nav><a href="/pricing">Pricing</a><a href="/terms">Terms</a><a href="/privacy">Privacy</a><a href="mailto:support@numelixa.com">Support</a></nav></header><section className="nx-public-hero"><span className="nx-public-eyebrow">TRANSPARENT GLOBAL PRICING</span><h1>One clear price.<br/>Across the world.</h1><p>Choose a service to explore available countries, current stock and the latest USD price before placing an order.</p></section><PricingExplorer/><PublicFooter/></main>}
