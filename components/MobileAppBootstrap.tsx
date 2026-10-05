"use client";
import {useEffect} from "react";
import {Capacitor} from "@capacitor/core";

const TOKEN_KEY="numelixa_fcm_token_v2_5_0";

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

  const removeGate=()=>document.getElementById("numelixa-notification-gate")?.remove();

  const openPermissionGate=()=>{
   if(stopped||document.getElementById("numelixa-notification-gate"))return;

   const gate=document.createElement("div");
   gate.id="numelixa-notification-gate";
   gate.style.cssText=[
    "position:fixed","inset:0","z-index:2147483647","display:flex",
    "align-items:center","justify-content:center","padding:24px",
    "background:rgba(1,13,18,.94)","backdrop-filter:blur(18px)"
   ].join(";");

   gate.innerHTML=[
    '<div style="width:min(420px,100%);padding:28px;border:1px solid rgba(255,255,255,.12);border-radius:28px;background:rgba(8,31,38,.98);box-shadow:0 24px 80px rgba(0,0,0,.45);color:#fff;text-align:center">',
    '<div style="font-size:42px;margin-bottom:12px">🔔</div>',
    '<h2 style="margin:0 0 10px;font-size:24px">Turn on notifications</h2>',
    '<p style="margin:0 0 22px;color:rgba(255,255,255,.72);line-height:1.55">Numelixa uses notifications for verification codes, order updates, refunds and important account alerts.</p>',
    '<button id="numelixa-notification-enable" style="width:100%;border:0;border-radius:16px;padding:14px 18px;font-weight:800;font-size:16px;background:#fff;color:#06161c">Enable notifications</button>',
    '<p style="margin:14px 0 0;color:rgba(255,255,255,.48);font-size:12px">You can manage notification permission from Android settings.</p>',
    '</div>'
   ].join("");

   document.body.appendChild(gate);
   gate.querySelector("#numelixa-notification-enable")?.addEventListener("click",()=>{
    void ensurePushPermission(true);
   });
  };

  const scheduleRetry=()=>{
   if(stopped||retryTimer)return;
   retryTimer=setTimeout(()=>{
    retryTimer=null;
    void ensurePushPermission(false);
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
    const response=await fetch("/api/notifications/register",{
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

    if(response.status===401){
     scheduleRetry();
     return false;
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

  const ensurePushPermission=async(showGate:boolean)=>{
   if(!push||stopped||permissionInFlight)return false;

   permissionInFlight=true;
   try{
    let current=await push.checkPermissions();

    if(current.receive!=="granted"){
     const requested=await push.requestPermissions();
     current=requested;
    }

    if(current.receive==="granted"){
     removeGate();

     try{
      await push.register();
     }catch(error){
      console.error("[NUMELIXA FCM REGISTER]",error);
      scheduleRetry();
      return false;
     }

     await syncStoredToken();
     return true;
    }

    if(showGate)openPermissionGate();
    else scheduleRetry();

    return false;
   }catch(error){
    console.error("[NUMELIXA PUSH PERMISSION]",error);
    if(showGate)openPermissionGate();
    else scheduleRetry();
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

    const received=await PushNotifications.addListener("pushNotificationReceived",()=>{
     window.dispatchEvent(new Event("numelixa-notification"));
    });
    cleanups.push(()=>received.remove());

    const action=await PushNotifications.addListener("pushNotificationActionPerformed",(event)=>{
     const raw=String(event.notification?.data?.url||"/");
     const url=raw.startsWith("/")?raw:"/";
     window.location.href=url;
    });
    cleanups.push(()=>action.remove());

    const retry=()=>{
     void ensurePushPermission(false);
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

    // Always request notification permission on a fresh/native app start.
    // The server registration itself is tied to the authenticated user.
    await ensurePushPermission(true);
    await syncStoredToken();

    const heartbeat=window.setInterval(()=>{
     void ensurePushPermission(false);
     void syncStoredToken();
    },10000);
    cleanups.push(()=>window.clearInterval(heartbeat));
   }catch(error){
    console.error("[NUMELIXA PUSH]",error);
    openPermissionGate();
   }
  })();

  return()=>{
   stopped=true;
   if(retryTimer)clearTimeout(retryTimer);
   removeGate();
   cleanups.forEach(fn=>{try{fn()}catch{}});
   document.documentElement.classList.remove("numelixa-native");
   document.body.classList.remove("numelixa-native");
  };
 },[]);

 return null;
}
