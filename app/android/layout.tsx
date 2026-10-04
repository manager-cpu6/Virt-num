import type {Metadata} from "next";

export const metadata:Metadata={
  title:"Numelixa APK — Android App Download",
  description:"Download the official Numelixa Android APK. Get virtual numbers, receive SMS verification codes, manage orders and wallet, and receive important notifications.",
  alternates:{canonical:"https://numelixa.com/android"},
  openGraph:{
    title:"Numelixa APK — Official Android App",
    description:"Download the official Numelixa Android APK for virtual numbers and SMS verification.",
    url:"https://numelixa.com/android",
    images:[{url:"/numelixa-favicon.png",width:512,height:512,alt:"Numelixa Android app"}]
  }
};

export default function AndroidLayout({children}:{children:React.ReactNode}){return children;}