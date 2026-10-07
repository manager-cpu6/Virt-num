import type {CapacitorConfig} from "@capacitor/cli";

const config:CapacitorConfig={
 appId:"com.numelixa.app",
 appName:"Numelixa",
 webDir:"public",
 server:{
  url:"https://numelixa.com",
  errorPath:"offline.html",
  cleartext:false,
  allowNavigation:[
   "numelixa.com",
   "www.numelixa.com",
   "docs.numelixa.com",
   "privacy.numelixa.com",
   "nowpayments.io",
   "www.nowpayments.io"
  ]
 },
 android:{
  allowMixedContent:false,
  captureInput:true,
  adjustMarginsForEdgeToEdge:"force"
 },
 plugins:{
  SplashScreen:{
   launchShowDuration:180,
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