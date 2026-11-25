import Link from "next/link";
import TavortAttribution from "@/components/TavortAttribution";

const groups=[
 {title:"Explore",links:[["Pricing","/pricing"],["Services","/services"],["Mobile app","/mobile-apps"],["API documentation","/developers/docs"]]},
 {title:"Company",links:[["About Numelixa","/about"],["Contact","/contact"],["For clients","/clients"],["For partners","/partners"],["Help center","/support"],["Security","/security"]]},
 {title:"Legal & policies",links:[["Legal center","/legal"],["Terms of service","/terms"],["Privacy policy","/privacy"],["Refund policy","/refund-policy"],["Cookie policy","/cookie-policy"],["Acceptable use","/rules"],["Account deletion","/account-deletion"]]},
];

export default function PublicFooter(){
 return <footer className="nx-public-footer">
  <div className="nx-footer-brand-column">
   <a className="nx-footer-brand" href="/"><img src="/numelixa-app-icon.webp" alt="" width="34" height="34"/><b>NUMELIXA</b></a>
   <p>Global virtual numbers and SMS verification, in one secure workspace. Serving customers since 2023.</p>
   <small>Founded in 2023 · Serving through 2026<br/>© 2026 Numelixa. All rights reserved.</small>
   <TavortAttribution mode="company"/>
   <a className="nx-footer-email" href="mailto:support@numelixa.com?subject=Numelixa%20Support%20Enquiry">support@numelixa.com</a>
  </div>
  <div className="nx-footer-groups">
   {groups.map(group=><section className="nx-footer-group" key={group.title}>
    <h2>{group.title}</h2>
    <nav aria-label={group.title}>{group.links.map(([label,href])=><Link href={href} key={href}>{label}</Link>)}</nav>
   </section>)}
  </div>
 </footer>;
}
