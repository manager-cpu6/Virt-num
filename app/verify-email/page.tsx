import Link from "next/link";
import VerifyEmailClient from "@/components/VerifyEmailClient";
import {getUser} from "@/lib/auth";
import {notFound} from "next/navigation";
export const dynamic="force-dynamic";
export default async function VerifyEmailPage(){const user=await getUser();if(!user)notFound();if(user.verified_at)return <div className="nx-verify-page"><a className="nx-verify-brand" href="https://numelixa.com/"><img src="/numelixa-app-icon.webp" alt="Numelixa"/> <b>NUMELIXA</b></a><div className="auth-page"><div className="form-card"><div className="success-box">✓ Your email is already verified.</div><Link className="primary-btn full" href="/account">Back to account</Link></div></div></div>;return <div className="nx-verify-page"><a className="nx-verify-brand" href="https://numelixa.com/"><img src="/numelixa-app-icon.webp" alt="Numelixa"/> <b>NUMELIXA</b></a><div className="auth-page"><h1>Confirm your email</h1><p>Enter the six-digit code we sent to your email address.</p><VerifyEmailClient email={user.email||""}/></div></div>}
