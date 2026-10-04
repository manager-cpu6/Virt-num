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
    let push:any=null;
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

    const showPermissionGate=()=>{
      if(document.getElementById("numelixa-notification-gate"))return;
      const gate=document.createElement("div");
      gate.id="numelixa-notification-gate";
      gate.innerHTML=`
        <div class="numelixa-notification-gate-backdrop"></div>
        <section class="numelixa-notification-gate-card" role="dialog" aria-modal="true">
          <div class="numelixa-notification-gate-logo">N</div>
          <div class="numelixa-notification-gate-icon">🔔</div>
          <span class="eyebrow">NUMELIXA ALERTS</span>
          <h2>Turn on notifications</h2>
          <p>Notifications are required to receive verification codes, number status, payments and important account updates.</p>
          <button id="numelixa-enable-notifications" type="button">Enable Notifications</button>
          <small>Please allow notifications in the Android permission window.</small>
        </section>`;
      document.body.appendChild(gate);

      const button=document.getElementById("numelixa-enable-notifications");
      button?.addEventListener("click",async()=>{
        if(!push)return;
        try{
          const result=await push.requestPermissions();
          if(result.receive==="granted"){
            gate.remove();
            await push.register();
          }
        }catch(error){
          console.error("[NUMELIXA PUSH PERMISSION]",error);
        }
      });
    };

    const removePermissionGate=()=>{
      document.getElementById("numelixa-notification-gate")?.remove();
    };

    const ensurePushPermission=async()=>{
      if(!push||stopped)return false;
      try{
        const current=await push.checkPermissions();
        if(current.receive==="granted"){
          removePermissionGate();
          await push.register();
          await syncStoredToken();
          return true;
        }

        // Ask only after authentication is ready. This makes the Android
        // permission prompt appear as part of the logged-in app experience.
        const result=await push.requestPermissions();
        if(result.receive==="granted"){
          removePermissionGate();
          await push.register();
          await syncStoredToken();
          return true;
        }

        // Android may keep the OS permission denied after a previous choice.
        // Show an in-app blocking gate so the user is prompted again instead
        // of silently leaving the account without push notifications.
        showPermissionGate();
        return false;
      }catch(error){
        console.error("[NUMELIXA PUSH PERMISSION]",error);
        showPermissionGate();
        return false;
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

        const retryOnAuth=()=>{
          void ensurePushPermission();
        };
        const retryOnOnline=()=>{
          void syncStoredToken();
          void ensurePushPermission();
        };
        const retryOnFocus=()=>{
          void syncStoredToken();
        };

        window.addEventListener("numelixa-auth-ready",retryOnAuth);
        window.addEventListener("online",retryOnOnline);
        window.addEventListener("focus",retryOnFocus);
        document.addEventListener("visibilitychange",retryOnFocus);

        cleanups.push(()=>{
          window.removeEventListener("numelixa-auth-ready",retryOnAuth);
          window.removeEventListener("online",retryOnOnline);
          window.removeEventListener("focus",retryOnFocus);
          document.removeEventListener("visibilitychange",retryOnFocus);
        });

        // Covers an already-authenticated session when the auth-ready event
        // happened before this component finished initializing.
        setTimeout(async()=>{
          try{
            const response=await fetch("/api/me",{cache:"no-store",credentials:"include"});
            if(response.ok){
              const data=await response.json();
              if(data?.user) await ensurePushPermission();
            }
          }catch{}
        },500);

        const heartbeat=window.setInterval(()=>{
          void syncStoredToken();
        },30000);
        cleanups.push(()=>window.clearInterval(heartbeat));
      }catch(error){
        console.error("[NUMELIXA PUSH]",error);
      }
    })();

    return()=>{
      stopped=true;
      if(retryTimer)clearTimeout(retryTimer);
      removePermissionGate();
      cleanups.forEach(fn=>{try{fn()}catch{}});
      document.documentElement.classList.remove("numelixa-native");
      document.body.classList.remove("numelixa-native");
    };
  },[]);

  return null;
}
