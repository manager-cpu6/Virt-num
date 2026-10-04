import "./globals.css";
import "./numelixa-polish.css";
import type {Metadata} from "next";
import BottomNav from "@/components/BottomNav";
import MobileAppBootstrap from "@/components/MobileAppBootstrap";

export const metadata:Metadata={
  metadataBase:new URL("https://numelixa.com"),
  title:{default:"Numelixa — Virtual Numbers & SMS Verification",template:"%s | Numelixa"},
  description:"Numelixa provides fast virtual phone numbers for receiving SMS verification codes online. Choose a service and country, get a number, and manage codes, orders and wallet in one place.",
  keywords:["Numelixa","Numelixa APK","Numelixa app","virtual numbers","virtual phone numbers","SMS verification","temporary phone numbers","receive SMS online","Android APK"],
  applicationName:"Numelixa",
  authors:[{name:"Numelixa"}],
  creator:"Numelixa",
  publisher:"Numelixa",
  category:"technology",
  alternates:{canonical:"https://numelixa.com/"},
  icons:{
    icon:[{url:"/numelixa-icon.svg",type:"image/svg+xml"},{url:"/numelixa-icon.svg",sizes:"512x512",type:"image/svg+xml"}],
    apple:"/numelixa-icon.svg"
  },
  openGraph:{
    type:"website",url:"https://numelixa.com/",siteName:"Numelixa",
    title:"Numelixa — Virtual Numbers & SMS Verification",
    description:"Fast virtual numbers for SMS verification codes. Simple, powerful and built for mobile.",
    images:[{url:"/numelixa-icon.svg",width:512,height:512,alt:"Numelixa app logo"}]
  },
  twitter:{card:"summary",title:"Numelixa — Virtual Numbers & SMS Verification",description:"Fast virtual numbers for SMS verification codes.",images:["/numelixa-icon.svg"]},
  manifest:"/manifest.webmanifest",
  themeColor:"#031b22"
};

export default function RootLayout({children}:{children:React.ReactNode}){
  return <html lang="en"><body><MobileAppBootstrap/><div className="app-shell"><main className="page-shell">{children}</main><BottomNav/></div></body></html>;
}