import type {CapacitorConfig} from "@capacitor/cli";

const config:CapacitorConfig={
 appId:"com.numelixa.app",
 appName:"Numelixa",
 webDir:"public",
 server:{
  // Keep the app inside the native WebView. Both production hostnames are trusted
  // so a normal www redirect never hands the user to Chrome.
  url:"https://numelixa.com",
  errorPath:"offline.html",
  cleartext:false,
  allowNavigation:[
   "app.numelixa.com",
   "numelixa.com",
   "www.numelixa.com",
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
   launchShowDuration:700,
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
