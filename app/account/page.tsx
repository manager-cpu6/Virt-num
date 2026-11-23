import Link from "next/link";
import TopBar from "@/components/TopBar";
import { getUser } from "@/lib/auth";
import AccountSessions from "@/components/AccountSessions";
import NumelixaIdCard from "@/components/NumelixaIdCard";
import {getSettings} from "@/lib/settings";
import PublicFooter from "@/components/PublicFooter";

function QuickIcon({name}:{name:string}){
 const paths:Record<string,React.ReactNode>={
  service:<><path d="M4 7h16l-1.5 13h-13L4 7Z"/><path d="M9 7a3 3 0 0 1 6 0"/></>,
  orders:<><path d="M7 3h8l4 4v14H7z"/><path d="M15 3v5h5M10 13h6M10 17h6"/></>,
  wallet:<><rect x="3" y="6" width="18" height="15" rx="3"/><path d="M3 10h18M16 15h2"/></>,
  api:<><path d="m8 8-4 4 4 4M16 8l4 4-4 4M14 5l-4 14"/></>
 };
 return <svg viewBox="0 0 24 24" width="23" height="23" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]||paths.api}</svg>;
}

export default async function AccountPage(){
 const user=await getUser();
 if(!user)return <div className="auth-page"><div className="brand-mark"><img src="/numelixa-brand.svg" alt="Numelixa" width="42" height="42"/></div><h1>Welcome to Numelixa</h1><p>Your account keeps your numbers, orders and wallet together.</p><div className="form-card"><Link className="primary-btn full" href="/login">Sign in</Link><Link className="secondary-btn full" href="/signup">Create account</Link></div></div>;
 const name=(user.name||"User").trim();
 const initial=name.charAt(0).toUpperCase()||"U";
 const pricing=await getSettings();
 const balanceUsd=(Number(user.coins||0)/(Number(pricing.coinsPerUsd)||100)).toFixed(2);
 const quick=[{href:"/services",icon:"shopping-bag",title:"Get a number",detail:"Choose a service",tone:"blue"},{href:"/numbers",icon:"receipt",title:"My orders",detail:"View your numbers",tone:"violet"},{href:"/wallet",icon:"wallet",title:"Wallet",detail:"Manage your balance",tone:"teal"},{href:"/developers/docs",icon:"code-2",title:"Developer API",detail:"Integrate with Numelixa",tone:"purple"}];
 return <div className="account-premium-page"><TopBar title="Account"/>
  <main className="account-premium-shell">
   <section className="account-profile-card"><div className="account-profile-glow"/>
    <div className="account-profile-top"><div className="account-avatar-premium">{initial}</div>
     <div className="account-identity"><div className="account-name-row"><h1>{name}</h1>{user.verified_at&&<span className="account-verified" aria-label="Verified">✓</span>}</div><p>{user.email}</p><span className="account-member-pill">NUMELIXA MEMBER</span></div>
     <Link href="/account" className="account-edit-btn" aria-label="Account settings">•••</Link>
    </div>
    <div className="account-profile-footer"><span>{user.merchantEnabled||user.role==="merchant"?"Merchant account":"Personal account"}</span><span>{user.verified_at?"Verified":"Verification required"}</span></div>
   </section>
   <NumelixaIdCard publicId={user.publicId}/>
   <section className="account-wallet-card"><div className="account-wallet-orb"><span aria-hidden="true">＄</span></div>
    <div className="account-wallet-copy"><span>AVAILABLE BALANCE</span><strong>${balanceUsd}</strong><small>USD available to spend</small></div>
    <Link href="/wallet" className="account-wallet-action">Add funds <b>↗</b></Link>
   </section>
   {!user.verified_at&&<section className="account-security-card"><div className="security-icon">!</div><div><b>Verify your email</b><small>Verification is required before purchasing a number.</small></div><Link href="/verify-email">Verify</Link></section>}
   {user.verified_at&&<section className="account-security-card verified"><div className="security-icon">✓</div><div><b>Account verified</b><small>Your email is verified and your account is ready.</small></div><span>Secure</span></section>}
   <div className="account-section-title"><div><span>QUICK ACCESS</span><h2>Everything you need</h2></div></div>
   <section className="account-action-grid" aria-label="Quick access">
    {quick.map(item=><Link href={item.href} key={item.href} className={"account-action-card account-action-card--"+item.tone}>
      <span className="account-action-icon" aria-hidden="true"><QuickIcon name={item.icon==="shopping-bag"?"service":item.icon==="receipt"?"orders":item.icon}/></span>
      <div><b>{item.title}</b><small>{item.detail}</small></div><i aria-hidden="true">↗</i>
    </Link>)}
   </section>
   <AccountSessions/>
   {(user.merchantEnabled||user.role==="merchant")&&<Link href="/merchant" className="account-admin-card"><span>↗</span><div><b>Merchant</b><small>Send and manage wallet funds</small></div><i>↗</i></Link>}
   {user.role==="admin"&&<Link href="/admin" className="account-admin-card"><span>✦</span><div><b>Admin Control Center</b><small>Manage Numelixa</small></div><i>↗</i></Link>}
   <form action="/api/auth/logout" method="post" className="account-logout-form"><button type="submit">Sign out <span>↗</span></button></form>
  </main>
  <PublicFooter/>
 </div>;
}
