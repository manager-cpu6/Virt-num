"use client";
import {useEffect} from "react";
import {Capacitor} from "@capacitor/core";

const TOKEN_KEY="numelixa_fcm_token";

export default function MobileAppBootstrap(){
  useEffect(()=>{
    if(!Capacitor.isNativePlatform()) return;

    document.documentElement.classList.add("numelixa-native");
    document.body.classList.add("numelixa-native");

    let stopped=false;
    let retryTimer:ReturnType<typeof setTimeout>|null=null;
    let syncInFlight=false;
    const cleanups:Array<()=>void>=[];

    const scheduleRetry=()=>{
      if(stopped||retryTimer)return;
      retryTimer=setTimeout(()=>{
        retryTimer=null;
        void syncStoredToken();
      },15000);
    };

    const syncToken=async(token:string)=>{
      if(!token||token.length<20||stopped||syncInFlight)return false;
      syncInFlight=true;
      try{
        localStorage.setItem(TOKEN_KEY,token);
        const response=await fetch("/api/notifications/register",{
          method:"POST",
          credentials:"include",
          cache:"no-store",
          headers:{"Content-Type":"application/json"},
          body:JSON.stringify({token,platform:Capacitor.getPlatform()})
        });
        if(response.ok){
          window.dispatchEvent(new Event("numelixa-push-ready"));
          return true;
        }
        // A 401 normally means the app opened before the user session was
        // available. Keep retrying so login later automatically binds the token.
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
        if(token) await syncToken(token);
      }catch{}
    };

    (async()=>{
      try{
        const {PushNotifications}=await import("@capacitor/push-notifications");

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

        // Register notification listeners before register() so a fast FCM
        // event cannot be missed.
        const registration=await PushNotifications.addListener(
          "registration",
          (event)=>{
            if(event?.value) void syncToken(event.value);
          }
        );
        cleanups.push(()=>registration.remove());

        const registrationError=await PushNotifications.addListener(
          "registrationError",
          (error)=>{
            console.error("[NUMELIXA FCM REGISTRATION]",error);
            scheduleRetry();
          }
        );
        cleanups.push(()=>registrationError.remove());

        const received=await PushNotifications.addListener(
          "pushNotificationReceived",
          ()=>window.dispatchEvent(new Event("numelixa-notification"))
        );
        cleanups.push(()=>received.remove());

        const action=await PushNotifications.addListener(
          "pushNotificationActionPerformed",
          (event)=>{
            const url=String(event.notification?.data?.url||"/notifications");
            window.location.href=url.startsWith("/")?url:"/notifications";
          }
        );
        cleanups.push(()=>action.remove());

        const permission=await PushNotifications.checkPermissions();
        const result=permission.receive==="granted"
          ?permission
          :await PushNotifications.requestPermissions();

        if(result.receive!=="granted"){
          console.warn("[NUMELIXA PUSH] Notification permission was not granted.");
          return;
        }

        await syncStoredToken();
        await PushNotifications.register();
        await syncStoredToken();

        // Login can happen after the first native bootstrap. These events make
        // the token bind to the authenticated user without reinstalling the app.
        const retryOnOnline=()=>{void syncStoredToken();};
        const retryOnFocus=()=>{void syncStoredToken();};
        const retryOnAuth=()=>{void syncStoredToken();};
        window.addEventListener("online",retryOnOnline);
        window.addEventListener("focus",retryOnFocus);
        window.addEventListener("numelixa-auth-ready",retryOnAuth);
        document.addEventListener("visibilitychange",retryOnFocus);
        cleanups.push(()=>{
          window.removeEventListener("online",retryOnOnline);
          window.removeEventListener("focus",retryOnFocus);
          window.removeEventListener("numelixa-auth-ready",retryOnAuth);
          document.removeEventListener("visibilitychange",retryOnFocus);
        });

        // Keep retrying while a token exists but the server has not accepted it.
        const heartbeat=window.setInterval(()=>{void syncStoredToken();},30000);
        cleanups.push(()=>window.clearInterval(heartbeat));
      }catch(error){
        console.error("[NUMELIXA PUSH]",error);
        scheduleRetry();
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
