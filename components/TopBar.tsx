import Link from "next/link";
export default function TopBar({title="Numelixa",back=false}:{title?:string;back?:boolean}){return <header className="topbar">{back?<Link href="/" className="icon-btn" aria-label="Back">‹</Link>:<div className="brand-mark">N</div>}<div className="top-title">{title}</div>{!back?<Link href="/admin" className="icon-btn">⌁</Link>:<div className="top-spacer"/>}</header>}
