"use client";
import {usePathname} from "next/navigation";
import BottomNav from "@/components/BottomNav";
export default function AppChrome({docs=false}:{docs?:boolean}){
 const path=usePathname();
 if(docs||path.startsWith("/developers"))return null;
 const publicPath=path==="/"||["/login","/signup","/forgot-password","/reset-password","/verify-email","/pricing","/terms","/privacy","/refund-policy","/cookie-policy","/account-deletion"].some(x=>path.startsWith(x));
 if(publicPath)return null;
 return <><BottomNav/><footer className="global-footer"><div><a href="/pricing">Pricing</a><a href="/terms">Terms of Service</a><a href="/privacy">Privacy</a><a href="/refund-policy">Refunds</a><a href="/cookie-policy">Cookies</a><a href="/account-deletion">Account Deletion</a><a href="mailto:support@numelixa.com">Contact</a><a href="https://developer.numelixa.com/">Developers</a></div><div>© 2026 Numelixa</div></footer></>;
}