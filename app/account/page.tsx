import Link from "next/link";
import TopBar from "@/components/TopBar";
import { getUser } from "@/lib/auth";
import AccountSessions from "@/components/AccountSessions";
import NumelixaIdCard from "@/components/NumelixaIdCard";
import {getSettings} from "@/lib/settings";

export default async function AccountPage(){
 const user=await getUser();
 if(!user)return <div className="auth-page"><div className="brand-mark"><img src="/numelixa-brand.svg" alt="Numelixa" width="42" height="42"/></div><h1>Welcome to Numelixa</h1><p>Your account keeps your numbers, orders and wallet together.</p><div className="form-card"><Link className="primary-btn full" href="/login">Sign in</Link><Link className="secondary-btn full" href="/signup">Create account</Link></div></div>;
 const name=(user.name||"User").trim();
 const initial=name.charAt(0).toUpperCase()||"U";
 const pricing=await getSettings();
 const balanceUsd=(Number(user.coins||0)/(Number(pricing.coinsPerUsd)||100)).toFixed(2);
 return <div className="account-premium-page"><TopBar title="Account"/>
  <main className="account-premium-shell">
   <section className="account-profile-card">
    <div className="account-profile-glow"/>
    <div className="account-profile-top">
      <div className="account-avatar-premium">{initial}</div>
      <div className="account-identity"><div className="account-name-row"><h1>{name}</h1>{user.verified_at&&<span className="account-verified">✓</span>}</div><p>{user.email}</p><span className="account-member-pill">♛ NUMELIXA MEMBER</span></div>
      <Link href="/account" className="account-edit-btn" aria-label="Account settings">•••</Link>
    </div>
    <div className="account-profile-footer"><span>{user.merchantEnabled||user.role==="merchant"?"Merchant account":"Personal account"}</span><span>{user.verified_at?"Verified":"Verification required"}</span></div>
   </section>
   <NumelixaIdCard publicId={user.publicId}/>
   <section className="account-wallet-card">
    <div className="account-wallet-orb">◈</div>
    <div className="account-wallet-copy"><span>AVAILABLE BALANCE</span><strong>${balanceUsd}</strong><small>USD available to spend</small></div>
    <Link href="/wallet" className="account-wallet-action">Add funds <b>↗</b></Link>
   </section>
   {!user.verified_at&&<section className="account-security-card"><div className="security-icon">!</div><div><b>Verify your email</b><small>Verification is required before purchasing a number.</small></div><Link href="/verify-email">Verify</Link></section>}
   {user.verified_at&&<section className="account-security-card verified"><div className="security-icon">✓</div><div><b>Account verified</b><small>Your email is verified and your account is ready.</small></div><span>Secure</span></section>}
   <div className="account-section-title"><div><span>QUICK ACCESS</span><h2>Everything you need</h2></div></div>
   <section className="account-action-grid" aria-label="Quick access">
    <Link href="/services" className="account-action-card account-action-card--get-number primary"><span className="account-action-icon">＋</span><div><b>Get a number</b><small>Choose a service</small></div><i>↗</i></Link>
    <Link href="/numbers" className="account-action-card account-action-card--orders"><span className="account-action-icon">▣</span><div><b>My orders</b><small>View your numbers</small></div><i>↗</i></Link>
    <Link href="/wallet" className="account-action-card account-action-card--wallet"><span className="account-action-icon">◈</span><div><b>Wallet</b><small>Manage your balance</small></div><i>↗</i></Link>
    <Link href="/developers" className="account-action-card account-action-card--developer-api"><span className="account-action-icon">⌘</span><div><b>Developer API</b><small>API access & keys</small></div><i>↗</i></Link>
   </section>
   <AccountSessions/>
   <section className="nx-account-links">
    <div className="account-section-title"><div><span>ACCOUNT & RESOURCES</span><h2>Manage your account</h2></div></div>
    <div className="nx-account-link-grid">
     <Link href="/forgot-password"><span>⌑</span><div><b>Password management</b><small>Start a secure password reset</small></div><i>→</i></Link>
     <Link href="/developers"><span>⌘</span><div><b>Developer API access</b><small>Manage API keys and webhooks</small></div><i>→</i></Link>
     <Link href="/developers/docs"><span>▤</span><div><b>API documentation</b><small>Verified endpoints and examples</small></div><i>→</i></Link>
     <Link href="/support"><span>◌</span><div><b>Contact Center</b><small>Support requests and official contact options</small></div><i>→</i></Link>
     <Link href="/clients"><span>?</span><div><b>For Clients</b><small>Guides and troubleshooting</small></div><i>→</i></Link>
     <Link href="/legal"><span>§</span><div><b>Legal Center</b><small>Policies and account deletion information</small></div><i>→</i></Link>
     <Link href="/security"><span>⌑</span><div><b>Security information</b><small>Account, API and app security controls</small></div><i>→</i></Link>
    </div>
   </section>
   {(user.merchantEnabled||user.role==="merchant")&&<Link href="/merchant" className="account-admin-card"><span>↗</span><div><b>Merchant</b><small>Send and manage wallet funds</small></div><i>↗</i></Link>}{user.role==="admin"&&<Link href="/admin" className="account-admin-card"><span>✦</span><div><b>Admin Control Center</b><small>Manage Numelixa</small></div><i>↗</i></Link>}
   <form action="/api/auth/logout" method="post" className="account-logout-form"><button type="submit">Sign out <span>↗</span></button></form>
  </main>
 </div>;
}
