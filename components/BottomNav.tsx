"use client";
import Link from "next/link";
import {usePathname,useRouter} from "next/navigation";
const items=[
 {href:"/dashboard",label:"Home",icon:"⌂"},
 {href:"/numbers",label:"Numbers",icon:"▣"},
 {href:"/countries",label:"Servers",icon:"🌐"},
 {href:"/wallet",label:"Wallet",icon:"◈"},
 {href:"/account",label:"Profile",icon:"◉"}
];
export default function BottomNav(){
 const path=usePathname(),router=useRouter();
 if(["/login","/signup","/forgot-password","/reset-password","/verify-email","/terms","/privacy"].some(x=>path.startsWith(x))||path==="/")return null;
 const warm=(href:string)=>{try{router.prefetch(href)}catch{}};
 return <nav className="bottom-nav" aria-label="Primary navigation">{items.map(i=><Link className={(path===i.href||(i.href==="/dashboard"&&path==="/")||(i.href==="/numbers"&&path.startsWith("/numbers"))||(i.href==="/countries"&&(path.startsWith("/countries")||path.startsWith("/services"))))?"nav-item selected":"nav-item"} href={i.href} key={i.href} aria-current={path===i.href?"page":undefined} prefetch onPointerDown={()=>warm(i.href)} onTouchStart={()=>warm(i.href)}><span aria-hidden="true">{i.icon}</span><small>{i.label}</small></Link>)}</nav>
}
