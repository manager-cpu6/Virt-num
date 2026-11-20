import Link from "next/link";
const policies=[
 {href:"/security",title:"Security Information",description:"How current account, API, webhook and Android security controls work."},
 {href:"/terms",title:"Terms of Service",description:"Account use, wallet and orders, API access, restrictions and service availability."},
 {href:"/privacy",title:"Privacy Policy",description:"Account, order, device, notification and support information."},
 {href:"/refunds",title:"Refund Policy",description:"Eligible wallet credits, completed orders and payment review."},
 {href:"/cookies",title:"Cookie Policy",description:"Essential storage, optional analytics and browser choices."},
 {href:"/acceptable-use",title:"Acceptable Use Policy",description:"Permitted use, prohibited activity and enforcement."},
 {href:"/account-deletion",title:"Account Deletion",description:"How to request deletion and what to review beforehand."}
];
export default function LegalCenterPage(){return <main className="nx-guide-page"><header className="nx-guide-nav"><Link href="/" className="nx-guide-brand"><img src="/numelixa-brand.svg" alt="" width="34" height="34"/> NUMELIXA</Link><nav><Link href="/support">Support</Link><Link href="/account">Account</Link></nav></header><section className="nx-guide-hero"><span className="nx-guide-kicker">POLICIES & ACCOUNTABILITY</span><h1>Legal Center</h1><p>Read the current Numelixa policies and account information. Policy text is preserved on its individual page; this hub provides a clear route to each document.</p></section><section className="nx-legal-index">{policies.map(policy=><Link href={policy.href} key={policy.href}><span className="nx-legal-index-icon">§</span><span><b>{policy.title}</b><small>{policy.description}</small></span><i>→</i></Link>)}</section><section className="nx-guide-bottom"><div><h2>Questions about a policy?</h2><p>Contact the support team for privacy, account or policy questions.</p></div><Link href="/support" className="nx-guide-primary">Contact support →</Link></section></main>}
