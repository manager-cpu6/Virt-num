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
   if(!clean||clean.length<20||stopped||syncInFlight)return false;

   localStorage.setItem(TOKEN_KEY,clean);
   syncInFlight=true;
   try{
    const response=await fetch("/api/notifications/register",{
     method:"POST",
     credentials:"include",
     cache:"no-store",
     headers:{"Content-Type":"application/json"},
     body:JSON.stringify({token:clean,platform:Capacitor.getPlatform()})
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

    // Do NOT create a custom Numelixa permission screen.
    // Android itself must show the normal system notification permission dialog.
    if(current.receive==="granted"){
     await push.register();
     await syncStoredToken();
     return true;
    }

    const result=await push.requestPermissions();
    if(result.receive==="granted"){
     await push.register();
     await syncStoredToken();
     return true;
    }

    console.warn("[NUMELIXA PUSH] Android notification permission was not granted.");
    return false;
   }catch(error){
    console.error("[NUMELIXA PUSH PERMISSION]",error);
    scheduleRetry();
    return false;
   }finally{
    permissionInFlight=false;
   }
  };

  const retryAfterAuth=()=>{
   void ensurePushPermission();
   void syncStoredToken();
   window.setTimeout(()=>void syncStoredToken(),1000);
   window.setTimeout(()=>void syncStoredToken(),3000);
   window.setTimeout(()=>void syncStoredToken(),10000);
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

    const received=await PushNotifications.addListener("pushNotificationReceived",()=>{
     window.dispatchEvent(new Event("numelixa-notification"));
    });
    cleanups.push(()=>received.remove());

    const action=await PushNotifications.addListener("pushNotificationActionPerformed",(event)=>{
     const raw=String(event.notification?.data?.url||"/");
     window.location.href=raw.startsWith("/")?raw:"/";
    });
    cleanups.push(()=>action.remove());

    window.addEventListener("numelixa-auth-ready",retryAfterAuth);
    window.addEventListener("online",retryAfterAuth);
    window.addEventListener("focus",retryAfterAuth);
    document.addEventListener("visibilitychange",retryAfterAuth);

    cleanups.push(()=>{
     window.removeEventListener("numelixa-auth-ready",retryAfterAuth);
     window.removeEventListener("online",retryAfterAuth);
     window.removeEventListener("focus",retryAfterAuth);
     document.removeEventListener("visibilitychange",retryAfterAuth);
    });

    // Android MainActivity requests the real system permission on first launch.
    // Once granted, Capacitor registers FCM and this component registers the token
    // against the currently authenticated Numelixa user.
    await ensurePushPermission();
    await syncStoredToken();

    const heartbeat=window.setInterval(()=>{
     void ensurePushPermission();
     void syncStoredToken();
    },10000);
    cleanups.push(()=>window.clearInterval(heartbeat));
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
