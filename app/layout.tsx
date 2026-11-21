import "./globals.css";
import "./numelixa-download.css";
import "./numelixa-auth-premium.css";
import "./first-party-checkout.css";
import "./usd-wallet.css";
import "./numelixa-polish.css";
import "./numelixa-nextgen.css";
import "./numelixa-live.css";
import "./numelixa-redesign.css";
import "./numelixa-native-app.css";
import "./admin-support.css";
import "./numelixa-liquid-glass.css";
import "./support/support.css";
import "./numelixa-public-pages.css";
import "./numelixa-platform.css";
import "./numelixa-service-refresh.css";
import "./numelixa-loading.css";
import type {Metadata,Viewport} from "next";
import {headers} from "next/headers";
import AppChrome from "@/components/AppChrome";
import MobileAppBootstrap from "@/components/MobileAppBootstrap";
import LoginApprovalGate from "@/components/LoginApprovalGate";
import AnalyticsTracker from "@/components/AnalyticsTracker";
import SystemMaintenanceGate from "@/components/SystemMaintenanceGate";
import CookieConsent from "@/components/CookieConsent";
import {collection} from "@/lib/mongo";
import {getUser} from "@/lib/auth";

export const metadata:Metadata={
 metadataBase:new URL("https://numelixa.com"),
 title:{default:"Numelixa — Virtual Numbers & SMS Verification",template:"%s | Numelixa"},
 description:"Numelixa provides fast virtual phone numbers for receiving SMS verification codes online. Buy a number, receive SMS verification codes, manage your wallet and get real mobile alerts.",
 keywords:["Numelixa","Numelixa APK","Numelixa app","Numelixa Android","Numelixa iOS","virtual numbers","virtual phone numbers","SMS verification","receive SMS online","Android APK"],
 applicationName:"Numelixa",authors:[{name:"Numelixa"}],creator:"Numelixa",publisher:"Numelixa",category:"technology",
 alternates:{canonical:"https://numelixa.com/"},
 icons:{icon:[{url:"/numelixa-brand.svg",type:"image/svg+xml"}],apple:"/numelixa-favicon.png"},
 openGraph:{type:"website",url:"https://numelixa.com/",siteName:"Numelixa",title:"Numelixa — Virtual Numbers & SMS Verification",description:"Fast virtual numbers, SMS verification, wallet and native mobile notifications.",images:[{url:"https://numelixa.com/numelixa-favicon.png",width:512,height:512,alt:"Numelixa app logo"}]},
 twitter:{card:"summary_large_image",title:"Numelixa — Virtual Numbers & SMS Verification",description:"Fast virtual numbers, SMS verification and native mobile alerts.",images:["https://numelixa.com/numelixa-favicon.png"]},
 manifest:"/manifest.webmanifest"
};
export const viewport:Viewport={themeColor:"#050b18"};
export default async function RootLayout({children}:{children:React.ReactNode}){
 const host=(await headers()).get("host")?.split(":")[0].toLowerCase()||"";
 const isDocsHost=host==="docs.numelixa.com";
 const isDownloadHost=host==="app.numelixa.com";
 const isSupportHost=host==="support.numelixa.com";
 const isCheckoutHost=host==="checkout.numelixa.com"||host==="payment.numelixa.com";
 let websiteMaintenance=false;
 let maintenanceMessage="Numelixa is temporarily under maintenance. Please check back soon.";
 let initialAdminVerified=false;
 if(!isDownloadHost){
  try{const state=await (await collection<any>("settings")).findOne({_id:"systemMaintenance"});websiteMaintenance=state?.websiteEnabled===true;maintenanceMessage=String(state?.message||maintenanceMessage);}catch{}
  if(websiteMaintenance){try{const currentUser=await getUser();initialAdminVerified=String(currentUser?.role||"").toLowerCase()==="admin";}catch{}}
 }

 return <html lang="en"><body>{isDownloadHost
  ? <div className="app-shell"><main className="page-shell docs-host-page">{children}</main></div>
  : <SystemMaintenanceGate initialEnabled={websiteMaintenance} initialMessage={maintenanceMessage} initialAdminVerified={initialAdminVerified}>
     {!isCheckoutHost&&!isSupportHost&&<><MobileAppBootstrap/><LoginApprovalGate/><AnalyticsTracker/></>}
     <div className={isSupportHost?"nx-support-host-shell":isCheckoutHost?"nx-checkout-shell":isDocsHost?"app-shell docs-host-shell":"app-shell"}>
      <main className={isSupportHost?"nx-support-host-main":isCheckoutHost?"nx-checkout-page":isDocsHost?"page-shell docs-host-page":"page-shell docs-host-page"}>{children}</main>
      {!isCheckoutHost&&!isSupportHost&&<AppChrome docs={isDocsHost}/>}
     </div>
    </SystemMaintenanceGate>
  }
  {!isDownloadHost&&!isSupportHost&&!isCheckoutHost&&!websiteMaintenance&&<CookieConsent/>}
 </body></html>;
}
