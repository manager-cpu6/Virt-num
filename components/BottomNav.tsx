"use client";
import Link from "next/link";
import {usePathname,useRouter} from "next/navigation";

const items=[
 {href:"/dashboard",label:"Home",icon:"home"},
 {href:"/services",label:"Numbers",icon:"globe"},
 {href:"/wallet",label:"Wallet",icon:"wallet"},
 {href:"/numbers",label:"Orders",icon:"receipt"},
 {href:"/account",label:"Account",icon:"user"}
];
function NavIcon({name}:{name:string}){const paths:Record<string,React.ReactNode>={home:<><path d="m3 10 9-7 9 7"/><path d="M5 9v11h14V9M9 20v-6h6v6"/></>,globe:<><circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3a15 15 0 0 1 0 18M12 3a15 15 0 0 0 0 18"/></>,wallet:<><rect x="3" y="5" width="18" height="15" rx="3"/><path d="M3 9h18M16 15h2"/></>,receipt:<><path d="M6 3h12v18l-3-2-3 2-3-2-3 2z"/><path d="M9 8h6M9 12h6M9 16h3"/></>,user:<><circle cx="12" cy="8" r="4"/><path d="M4 21a8 8 0 0 1 16 0"/></>};return <svg viewBox="0 0 24 24" width="22" height="22" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{paths[name]}</svg>;}

export default function BottomNav(){
 const path=usePathname();
 const router=useRouter();
 if(["/login","/signup","/forgot-password","/reset-password"].some(x=>path.startsWith(x)))return null;

 const warm=(href:string)=>{
   // Warm the next route on the first touch, not after the tap is released.
   try{router.prefetch(href)}catch{}
 };

 const isSelected=(href:string)=>{
  if(href==="/dashboard")return path==="/dashboard";
  if(href==="/services")return path.startsWith("/services")||path.startsWith("/countries");
  if(href==="/numbers")return path==="/numbers"||path.startsWith("/get-code/");
  return path===href||path.startsWith(href+"/");
 };

 return <nav className="bottom-nav" aria-label="Primary navigation">
  {items.map(i=>
   <Link
    className={isSelected(i.href)?"nav-item selected":"nav-item"}
    href={i.href}
    key={i.href}
    aria-current={isSelected(i.href)?"page":undefined}
    prefetch
    onPointerDown={()=>warm(i.href)}
    onTouchStart={()=>warm(i.href)}
   >
    <span className="nav-icon"><NavIcon name={i.icon}/></span><small>{i.label}</small>
   </Link>
  )}
 </nav>
}
