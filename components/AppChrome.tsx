"use client";
import {usePathname} from "next/navigation";
import BottomNav from "@/components/BottomNav";
export default function AppChrome({docs=false}:{docs?:boolean}){
 const path=usePathname();
 if(docs||path.startsWith("/developers"))return null;
 const publicPath=path==="/"||["/login","/signup","/forgot-password","/reset-password","/verify-email","/pricing","/terms","/privacy","/refund-policy","/cookie-policy","/account-deletion","/clients","/partners","/legal","/security","/faq","/rules","/support"].some(x=>path.startsWith(x));
 if(publicPath)return null;
 // Route pages render their own shared footer. Rendering it here as well caused
 // a second complete brand/legal directory after Home, Account and Services.
 return <BottomNav/>;
}
