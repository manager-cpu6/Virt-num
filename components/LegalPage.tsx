import type {ReactNode} from "react";
import PublicFooter from "@/components/PublicFooter";
export default function LegalPage({title,updated,children}:{title:string;updated?:string;children:ReactNode}){
 return <main className="nx-legal-page"><header className="nx-public-nav"><a href="/" className="nx-public-brand">NUMELIXA</a><nav><a href="/pricing">Pricing</a><a href="/terms">Terms</a><a href="/privacy">Privacy</a><a href="mailto:support@numelixa.com">Support</a></nav></header><article><span className="nx-public-eyebrow">NUMELIXA · LEGAL & INFORMATION</span><h1>{title}</h1><p className="nx-legal-updated">Last updated: {updated||"19 November 2026"}</p><div className="nx-legal-content">{children}</div><p className="nx-legal-contact">Questions? Contact <a href="mailto:support@numelixa.com">support@numelixa.com</a>.</p></article><PublicFooter/></main>
}
