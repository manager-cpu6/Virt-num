"use client";
import Link from "next/link";
import {usePathname} from "next/navigation";
const items=[{href:"/",label:"Home",icon:"⌂"},{href:"/services",label:"Numbers",icon:"＋"},{href:"/wallet",label:"Wallet",icon:"◉"},{href:"/numbers",label:"Orders",icon:"▣"}];
export default function BottomNav(){const path=usePathname();return <nav className="bottom-nav">{items.map(i=><Link className={path===i.href?"nav-item selected":"nav-item"} href={i.href} key={i.href}><span>{i.icon}</span><small>{i.label}</small></Link>)}</nav>}
