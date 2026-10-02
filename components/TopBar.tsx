import Link from "next/link";
import {getUser} from "@/lib/auth";
export default async function TopBar({title="Numelixa",back=false}:{title?:string;back?:boolean}){
  const user=await getUser();
  return <header className="topbar">
    {back?<Link href="/" className="icon-btn" aria-label="Back">‹</Link>:<Link href="/" className="brand-mark">N</Link>}
    <div className="top-title">{title}</div>
    {!back?(user?<Link href="/account" className="icon-btn" aria-label="Account">●</Link>:<Link href="/login" className="icon-btn" aria-label="Sign in">↪</Link>):<div className="top-spacer"/>}
  </header>;
}