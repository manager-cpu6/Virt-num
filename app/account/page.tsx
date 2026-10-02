import Link from "next/link";
import TopBar from "@/components/TopBar";
import {getUser} from "@/lib/auth";
export default async function AccountPage(){
 const user=await getUser();
 if(!user)return <div className="auth-page"><div className="brand-mark">N</div><h1>Welcome to Numelixa</h1><p>Your account keeps your numbers, orders and wallet together.</p><div className="form-card"><Link className="primary-btn full" href="/login">Sign in</Link><Link className="secondary-btn full" href="/signup">Create account</Link></div></div>;
 const initial=(user.name||"U").trim().charAt(0).toUpperCase();
 return <div>
  <TopBar title="Account"/>
  <div className="account-hero"><div className="profile-avatar">{initial}</div><div><h1>{user.name}</h1><p>{user.email}</p></div></div>
  <div className="wallet-hero"><span>AVAILABLE COINS</span><strong>{Number(user.coins||0).toLocaleString()}</strong><small>Use your balance to get numbers.</small></div>
  <div className="quick-grid">
   <Link href="/services" className="quick-card"><span>＋</span><div><b>Get a number</b><small>Choose a service</small></div><i>→</i></Link>
   <Link href="/wallet" className="quick-card"><span>◈</span><div><b>Add coins</b><small>Top up securely</small></div><i>→</i></Link>
  </div>
  <div className="form-card"><Link href="/numbers" className="secondary-btn full">View my orders</Link><form action="/api/auth/logout" method="post"><button className="secondary-btn full" type="submit">Sign out</button></form></div>
 </div>;
}