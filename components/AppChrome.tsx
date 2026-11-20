"use client";
import {usePathname} from "next/navigation";
import BottomNav from "@/components/BottomNav";
import PublicFooter from "@/components/PublicFooter";

export default function AppChrome({docs=false}:{docs?:boolean}){
 const path=usePathname();
 if(docs||path.startsWith("/developers"))return null;

 const authPath=["/login","/signup","/forgot-password","/reset-password","/verify-email"].some(x=>path===x||path.startsWith(x+"/"));
 if(authPath)return null;

 const publicPath=path==="/"||[
  "/pricing","/terms","/privacy","/refunds","/cookies","/acceptable-use","/refund-policy","/cookie-policy",
  "/account-deletion","/clients","/partners","/legal","/security","/services","/countries","/mobile-apps",
  "/faq","/rules","/support"
 ].some(x=>path===x||path.startsWith(x+"/"));

 if(publicPath)return <PublicFooter/>;
 return <><BottomNav/><PublicFooter/></>;
}
