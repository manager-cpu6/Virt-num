"use client";
import {useEffect} from "react";
import {Capacitor} from "@capacitor/core";
export default function MobileAppBootstrap(){
 useEffect(()=>{
  if(!Capacitor.isNativePlatform())return;
  document.documentElement.classList.add("numelixa-native");document.body.classList.add("numelixa-native");
  let cleanup=()=>{};
  (async()=>{
   try{
    const {PushNotifications}=await import("@capacitor/push-notifications");
    const permission=await PushNotifications.checkPermissions();
    const result=permission.receive==="granted"?permission:await PushNotifications.requestPermissions();
    if(result.receive!=="granted")return;
    await PushNotifications.register();
    const registration=await new Promise<any>((resolve,reject)=>{
      let done=false;const finish=(v:any)=>{if(done)return;done=true;resolve(v)};
      PushNotifications.addListener("registration",(token)=>finish(token));
      PushNotifications.addListener("registrationError",(err)=>{if(!done){done=true;reject(err)}});
      setTimeout(()=>finish(null),8000);
    });
    if(registration?.value)await fetch("/api/notifications/register",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({token:registration.value,platform:Capacitor.getPlatform()})});
    const received=await PushNotifications.addListener("pushNotificationReceived",()=>window.dispatchEvent(new Event("numelixa-notification")));
    cleanup=()=>received.remove();
   }catch{}
  })();
  return()=>{cleanup();document.documentElement.classList.remove("numelixa-native");document.body.classList.remove("numelixa-native")};
 },[]);
 return null;
}
