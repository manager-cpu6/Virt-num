import Link from "next/link";

const groups=[
 {title:"PRODUCT",links:[["Services","/services"],["Pricing","/pricing"],["Mobile App","/mobile-apps"],["Wallet","/wallet"]]},
 {title:"CLIENTS",links:[["For Clients","/clients"],["Help Center","/faq"],["Contact Support","/support"]]},
 {title:"PARTNERS",links:[["For Partners","/partners"]]},
 {title:"DEVELOPERS",links:[["API Documentation","/developers/docs"],["Developer Portal","/developers"],["Webhooks","/developers/docs#webhooks"]]},
 {title:"LEGAL",links:[["Terms of Service","/terms"],["Privacy Policy","/privacy"],["Refund Policy","/refunds"],["Cookie Policy","/cookies"],["Acceptable Use","/acceptable-use"],["Account Deletion","/account-deletion"]]}
];

export default function PublicFooter(){
 return <footer className="nx-global-footer">
  <div className="nx-global-footer-inner">
   <div className="nx-global-footer-brand">
    <Link href="/" className="nx-global-footer-logo"><img src="/numelixa-brand.svg" alt="Numelixa" width="34" height="34"/><span>NUMELIXA</span></Link>
    <p>Global virtual numbers and SMS verification in one secure workspace.</p>
    <a className="nx-global-footer-email" href="mailto:support@numelixa.com">support@numelixa.com</a>
    <small>© {new Date().getFullYear()} Numelixa. All rights reserved.</small>
   </div>
   <div className="nx-global-footer-groups">
    {groups.map(group=><nav key={group.title} aria-label={group.title}>
     <h2>{group.title}</h2>
     {group.links.map(([label,href])=><Link href={href} key={href}>{label}</Link>)}
    </nav>)}
   </div>
  </div>
 </footer>;
}
