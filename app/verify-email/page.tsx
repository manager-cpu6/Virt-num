import Link from "next/link";
import TopBar from "@/components/TopBar";
import VerifyEmailClient from "@/components/VerifyEmailClient";
import {getUser} from "@/lib/auth";
import {notFound} from "next/navigation";
export const dynamic="force-dynamic";
export default async function VerifyEmailPage(){const user=await getUser();if(!user)notFound();if(user.verified_at)return <div><TopBar title="Verify email" back/><div className="auth-page"><div className="form-card"><div className="success-box">✓ Your email is already verified.</div><Link className="primary-btn full" href="/account">Back to account</Link></div></div></div>;return <div><TopBar title="Verify email" back/><div className="auth-page"><div className="brand-mark">N</div><h1>Confirm your email</h1><p>We use your email to protect number purchases and your account.</p><VerifyEmailClient/></div></div>}
