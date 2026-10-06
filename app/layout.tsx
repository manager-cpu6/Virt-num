import "./globals.css";
import "./numelixa-polish.css";
import type {Metadata} from "next";
import {headers} from "next/headers";
import BottomNav from "@/components/BottomNav";
import MobileAppBootstrap from "@/components/MobileAppBootstrap";
import AppUpdateGate from "@/components/AppUpdateGate";
import LoginApprovalGate from "@/components/LoginApprovalGate";

export const metadata:Metadata={
 metadataBase:new URL("https://numelixa.com"),
 title:{default:"Numelixa — Virtual Numbers & SMS Verification",template:"%s | Numelixa"},
 description:"Numelixa provides fast virtual phone numbers for receiving SMS verification codes online. Buy a number, receive SMS verification codes, manage your wallet and get real mobile alerts.",
 keywords:["Numelixa","Numelixa APK","Numelixa app","Numelixa Android","Numelixa iOS","virtual numbers","virtual phone numbers","SMS verification","receive SMS online","Android APK"],
 applicationName:"Numelixa",authors:[{name:"Numelixa"}],creator:"Numelixa",publisher:"Numelixa",category:"technology",
 alternates:{canonical:"https://numelixa.com/"},
 icons:{icon:[{url:"/numelixa-favicon.png",type:"image/png"},{url:"/numelixa-favicon.png",sizes:"512x512",type:"image/png"}],apple:"/numelixa-favicon.png"},
 openGraph:{type:"website",url:"https://numelixa.com/",siteName:"Numelixa",title:"Numelixa — Virtual Numbers & SMS Verification",description:"Fast virtual numbers, SMS verification, wallet and native mobile notifications.",images:[{url:"https://numelixa.com/numelixa-favicon.png",width:512,height:512,alt:"Numelixa app logo"}]},
 twitter:{card:"summary_large_image",title:"Numelixa — Virtual Numbers & SMS Verification",description:"Fast virtual numbers, SMS verification and native mobile alerts.",images:["https://numelixa.com/numelixa-favicon.png"]},
 manifest:"/manifest.webmanifest",themeColor:"#031b22"
};
export default async function RootLayout({children}:{children:React.ReactNode}){
 const host=(await headers()).get("host")?.split(":")[0].toLowerCase()||"";
 const isDocsHost=host==="docs.numelixa.com";
 return <html lang="en"><body><MobileAppBootstrap/><LoginApprovalGate/><AppUpdateGate/><div className={isDocsHost?"app-shell docs-host-shell":"app-shell"}><main className={isDocsHost?"page-shell docs-host-page":"page-shell"}>{children}</main>{!isDocsHost&&<><BottomNav/><footer style={{padding:"28px 18px 100px",textAlign:"center",color:"#6f9192",fontSize:11}}><div style={{display:"flex",justifyContent:"center",gap:14,flexWrap:"wrap"}}><a href="/rules" style={{color:"#72dfce"}}>Rules</a><a href="/faq" style={{color:"#72dfce"}}>FAQ</a><a href="/terms" style={{color:"#72dfce"}}>Terms</a><a href="/privacy" style={{color:"#72dfce"}}>Privacy</a><a href="/developers" style={{color:"#72dfce"}}>Developers</a></div><div style={{marginTop:10}}>© 2026 Numelixa</div></footer></>}</div></body></html>;
}
