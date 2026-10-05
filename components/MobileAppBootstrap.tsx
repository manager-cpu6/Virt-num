"use client";
import {useEffect} from "react";
import {Capacitor} from "@capacitor/core";

const TOKEN_KEY="numelixa_fcm_token_v2_6_0";

export default function MobileAppBootstrap(){
 useEffect(()=>{
  if(!Capacitor.isNativePlatform())return;

  document.documentElement.classList.add("numelixa-native");
  document.body.classList.add("numelixa-native");

  let stopped=false;
  let push:any=null;
  let syncInFlight=false;
  let permissionInFlight=false;
  let retryTimer:ReturnType<typeof setTimeout>|null=null;
  let retryInterval:ReturnType<typeof setInterval>|null=null;
  let lastToken="";

  const cleanups:Array<()=>void>=[];

  const scheduleRetry=()=>{
   if(stopped||retryTimer)return;
   retryTimer=setTimeout(()=>{
    retryTimer=null;
    void ensurePushPermission();
    void syncStoredToken();
   },5000);
  };

  const syncToken=async(token:string)=>{
   const clean=String(token||"").trim();
   if(!clean||clean.length<20||stopped)return false;

   localStorage.setItem(TOKEN_KEY,clean);
   if(syncInFlight)return false;

   syncInFlight=true;
   try{
    const apiBase=(window.location.origin==="https://numelixa.com"||window.location.origin==="https://www.numelixa.com")
      ? window.location.origin
      : "https://numelixa.com";
    const response=await fetch(apiBase+"/api/notifications/register",{
     method:"POST",
     credentials:"include",
     cache:"no-store",
     headers:{"Content-Type":"application/json"},
     body:JSON.stringify({
      token:clean,
      platform:Capacitor.getPlatform()
     })
    });

    if(response.ok){
     window.dispatchEvent(new Event("numelixa-push-ready"));
     return true;
    }

    scheduleRetry();
    return false;
   }catch(error){
    console.error("[NUMELIXA PUSH REGISTER]",error);
    scheduleRetry();
    return false;
   }finally{
    syncInFlight=false;
   }
  };

  const syncStoredToken=async()=>{
   try{
    const token=localStorage.getItem(TOKEN_KEY);
    if(token)await syncToken(token);
   }catch(error){
    console.error("[NUMELIXA PUSH STORED TOKEN]",error);
   }
  };

  const ensurePushPermission=async()=>{
   if(!push||stopped||permissionInFlight)return false;

   permissionInFlight=true;
   try{
    const current=await push.checkPermissions();

    // MainActivity owns the first-install Android POST_NOTIFICATIONS prompt.
    // This bootstrap never creates a custom permission screen and never
    // repeatedly prompts users. It only registers FCM when permission exists.
    if(current.receive!=="granted"){
     console.warn("[NUMELIXA PUSH] Native notification permission is not granted.");
     return false;
    }

    try{
     await push.register();
    }catch(error){
     console.error("[NUMELIXA FCM REGISTER]",error);
     scheduleRetry();
     return false;
    }

    await syncStoredToken();
    return true;
   }catch(error){
    console.error("[NUMELIXA PUSH PERMISSION]",error);
    scheduleRetry();
    return false;
   }finally{
    permissionInFlight=false;
   }
  };

  (async()=>{
   try{
    const {PushNotifications}=await import("@capacitor/push-notifications");
    push=PushNotifications;

    if(Capacitor.getPlatform()==="android"){
     try{
      await PushNotifications.createChannel({
       id:"numelixa",
       name:"Numelixa",
       description:"Important Numelixa alerts",
       importance:5,
       sound:"default",
       vibration:true
      });
     }catch(error){
      console.warn("[NUMELIXA PUSH CHANNEL]",error);
     }
    }

    const registration=await PushNotifications.addListener("registration",(event)=>{
     if(event?.value)void syncToken(event.value);
    });
    cleanups.push(()=>registration.remove());

    const registrationError=await PushNotifications.addListener("registrationError",(error)=>{
     console.error("[NUMELIXA FCM REGISTRATION]",error);
     scheduleRetry();
    });
    cleanups.push(()=>registrationError.remove());

    const received=await PushNotifications.addListener("pushNotificationReceived",(event)=>{
     window.dispatchEvent(new CustomEvent("numelixa-notification",{detail:event}));
    });
    cleanups.push(()=>received.remove());

    const action=await PushNotifications.addListener("pushNotificationActionPerformed",(event)=>{
     const raw=String(event.notification?.data?.url||"/");
     window.location.href=raw.startsWith("/")?raw:"/";
    });
    cleanups.push(()=>action.remove());

    const retry=()=>{
     void ensurePushPermission();
     void syncStoredToken();
     window.setTimeout(()=>void syncStoredToken(),1000);
     window.setTimeout(()=>void syncStoredToken(),3000);
     window.setTimeout(()=>void syncStoredToken(),10000);
    };

    window.addEventListener("numelixa-auth-ready",retry);
    window.addEventListener("online",retry);
    window.addEventListener("focus",retry);
    document.addEventListener("visibilitychange",retry);

    cleanups.push(()=>{
     window.removeEventListener("numelixa-auth-ready",retry);
     window.removeEventListener("online",retry);
     window.removeEventListener("focus",retry);
     document.removeEventListener("visibilitychange",retry);
    });

    // On first install Android shows its own POST_NOTIFICATIONS dialog.
    // If permission is already allowed, nothing is displayed.
    await ensurePushPermission();
    await syncStoredToken();

    // Keep registration alive. This is intentionally independent of the
    // notification permission dialog: permission and FCM device registration
    // are separate steps. If login finishes after the FCM token is created,
    // the same token is uploaded again and attached to the current user.
    retryInterval=window.setInterval(()=>{
     if(lastToken) void syncToken(lastToken);
     else void syncStoredToken();
    },2000);
    cleanups.push(()=>window.clearInterval(retryInterval));
   }catch(error){
    console.error("[NUMELIXA PUSH]",error);
   }
  })();

  return()=>{
   stopped=true;
   if(retryTimer)clearTimeout(retryTimer);
   cleanups.forEach(fn=>{try{fn()}catch{}});
   document.documentElement.classList.remove("numelixa-native");
   document.body.classList.remove("numelixa-native");
  };
 },[]);

 return null;
}
