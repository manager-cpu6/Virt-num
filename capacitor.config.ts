import type {CapacitorConfig} from "@capacitor/cli";

const config:CapacitorConfig={
 appId:"com.numelixa.app",
 appName:"Numelixa",
 webDir:"public",
 server:{
  // Use the verified Vercel project domain for the native WebView.
  // numelixa.com is currently pending Vercel domain verification.
  url:"https://virt-num-liart.vercel.app",
  errorPath:"offline.html",
  cleartext:false,
  allowNavigation:[
   "virt-num-liart.vercel.app",
   "numelixa.com",
   "www.numelixa.com",
   "app.numelixa.com",
   "docs.numelixa.com",
   "privacy.numelixa.com"
  ]
 },
 android:{
  allowMixedContent:false,
  captureInput:true,
  adjustMarginsForEdgeToEdge:"force"
 },
 plugins:{
  SplashScreen:{
   launchShowDuration:1200,
   launchAutoHide:true,
   backgroundColor:"#031b22",
   showSpinner:false
  },
  PushNotifications:{
   presentationOptions:["badge","sound","alert"]
  }
 }
};

export default config;
