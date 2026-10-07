"use client";
import {usePathname} from "next/navigation";
import BottomNav from "@/components/BottomNav";
export default function AppChrome({docs=false}:{docs?:boolean}){
 const path=usePathname();
 if(docs)return null;
 const publicPath=path==="/"||["/login","/signup","/forgot-password","/reset-password","/verify-email"].some(x=>path.startsWith(x));
 if(publicPath)return null;
 return <><BottomNav/><footer className="global-footer"><div><a href="/rules">Rules</a><a href="/faq">FAQ</a><a href="/terms">Terms</a><a href="/privacy">Privacy</a><a href="/developers">Developers</a></div><div>© 2026 Numelixa</div></footer></>;
}