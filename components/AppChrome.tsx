"use client";
import {usePathname} from "next/navigation";
import BottomNav from "@/components/BottomNav";
import PublicFooter from "@/components/PublicFooter";
export default function AppChrome({docs=false}:{docs?:boolean}){
 const path=usePathname();
 if(docs||path.startsWith("/developers"))return null;
 const publicPath=path==="/"||["/login","/signup","/forgot-password","/reset-password","/verify-email","/pricing","/terms","/privacy","/refund-policy","/cookie-policy","/account-deletion","/clients","/partners","/legal","/security","/faq","/rules","/support","/about","/contact"].some(x=>path.startsWith(x));
 if(publicPath)return null;
 // These route components already include PublicFooter. Keep the global footer
 // for app routes that do not render one, but never mount two copies.
 const routeOwnsFooter=["/dashboard","/account","/services"].some(route=>path===route||path.startsWith(route+"/"));
 return <><BottomNav/>{routeOwnsFooter?null:<PublicFooter/>}</>;
}
