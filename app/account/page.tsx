import Link from "next/link";
import TopBar from "@/components/TopBar";
import { getUser } from "@/lib/auth";

export default async function AccountPage(){
 const user=await getUser();
 if(!user)return <div className="auth-page"><div className="brand-mark">N</div><h1>Welcome to Numelixa</h1><p>Your account keeps your numbers, orders and wallet together.</p><div className="form-card"><Link className="primary-btn full" href="/login">Sign in</Link><Link className="secondary-btn full" href="/signup">Create account</Link></div></div>;
 const name=(user.name||"User").trim();
 const initial=name.charAt(0).toUpperCase()||"U";
 const coins=Number(user.coins||0).toLocaleString();
 return <div className="account-premium-page"><TopBar title="Account"/>
  <main className="account-premium-shell">
   <section className="account-profile-card">
    <div className="account-profile-glow"/>
    <div className="account-profile-top">
      <div className="account-avatar-premium">{initial}</div>
      <div className="account-identity"><div className="account-name-row"><h1>{name}</h1>{user.verified_at&&<span className="account-verified">✓</span>}</div><p>{user.email}</p><span className="account-member-pill">NUMELIXA MEMBER</span></div>
      <Link href="/account" className="account-edit-btn" aria-label="Account settings">•••</Link>
    </div>
    <div className="account-profile-footer"><span>Personal account</span><span>{user.verified_at?"Verified":"Verification required"}</span></div>
   </section>
   <section className="account-wallet-card">
    <div className="account-wallet-orb">◈</div>
    <div className="account-wallet-copy"><span>AVAILABLE BALANCE</span><strong>{coins}</strong><small>Coins ready to use</small></div>
    <Link href="/wallet" className="account-wallet-action">Add coins <b>↗</b></Link>
   </section>
   {!user.verified_at&&<section className="account-security-card"><div className="security-icon">!</div><div><b>Verify your email</b><small>Verification is required before purchasing a number.</small></div><Link href="/verify-email">Verify</Link></section>}
   {user.verified_at&&<section className="account-security-card verified"><div className="security-icon">✓</div><div><b>Account verified</b><small>Your email is verified and your account is ready.</small></div><span>Secure</span></section>}
   <div className="account-section-title"><div><span>QUICK ACCESS</span><h2>Everything you need</h2></div></div>
   <section className="account-action-grid">
    <Link href="/services" className="account-action-card primary"><span className="account-action-icon">＋</span><div><b>Get a number</b><small>Choose a service</small></div><i>↗</i></Link>
    <Link href="/numbers" className="account-action-card"><span className="account-action-icon">▣</span><div><b>My orders</b><small>View your numbers</small></div><i>↗</i></Link>
    <Link href="/wallet" className="account-action-card"><span className="account-action-icon">◈</span><div><b>Wallet</b><small>Manage your balance</small></div><i>↗</i></Link>
    <Link href="/developers" className="account-action-card"><span className="account-action-icon">⌘</span><div><b>Developer API</b><small>API access & keys</small></div><i>↗</i></Link>
   </section>
   {user.role==="admin"&&<Link href="/admin" className="account-admin-card"><span>✦</span><div><b>Admin Control Center</b><small>Manage Numelixa</small></div><i>↗</i></Link>}
   <form action="/api/auth/logout" method="post" className="account-logout-form"><button type="submit">Sign out <span>↗</span></button></form>
  </main>
 </div>;
}
