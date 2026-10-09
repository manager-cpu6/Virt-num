"use client";
import Link from "next/link";
import {usePathname,useRouter} from "next/navigation";

const items=[
 {href:"/",label:"Home",icon:"⌂"},
 {href:"/services",label:"Numbers",icon:"＋"},
 {href:"/wallet",label:"Wallet",icon:"◈"},
 {href:"/numbers",label:"Orders",icon:"▣"},
 {href:"/account",label:"Account",icon:"◉"}
];

export default function BottomNav(){
 const path=usePathname();
 const router=useRouter();
 if(["/login","/signup","/forgot-password","/reset-password"].some(x=>path.startsWith(x)))return null;

 const warm=(href:string)=>{
   // Warm the next route on the first touch, not after the tap is released.
   try{router.prefetch(href)}catch{}
 };

 const isSelected=(href:string)=>{
  if(href==="/")return path==="/"||path==="/dashboard";
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
    <span aria-hidden="true">{i.icon}</span><small>{i.label}</small>
   </Link>
  )}
 </nav>
}
