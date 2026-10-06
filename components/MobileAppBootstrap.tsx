"use client";
import {useEffect} from "react";
import {Capacitor,registerPlugin} from "@capacitor/core";

const TOKEN_KEY="numelixa_fcm_token_v4";
const NativePushToken=registerPlugin<{getToken():Promise<{token?:string}>}>("NumelixaPushToken");

export default function MobileAppBootstrap(){
 useEffect(()=>{
  if(!Capacitor.isNativePlatform())return;
  document.documentElement.classList.add("numelixa-native");
  document.body.classList.add("numelixa-native");

  let stopped=false;
  let retryTimer:ReturnType<typeof setTimeout>|null=null;
  let permissionInFlight=false;
  let push:any=null;
  let tokenInFlight=false;
  const cleanups:Array<()=>void>=[];

  const isAuthenticated=async()=>{
   try{
    const r=await fetch("/api/me",{cache:"no-store",credentials:"include"});
    return r.ok;
   }catch{return false}
  };

  const scheduleRetry=()=>{
   if(stopped||retryTimer)return;
   retryTimer=setTimeout(()=>{retryTimer=null;void syncCurrentToken()},5000);
  };

  const saveAndRegister=async(token:string)=>{
   token=String(token||"").trim();
   if(token.length<20||stopped||tokenInFlight)return false;
   if(!(await isAuthenticated()))return false;
   tokenInFlight=true;
   try{
    localStorage.setItem(TOKEN_KEY,token);
    const response=await fetch("/api/notifications/register",{
     method:"POST",credentials:"include",cache:"no-store",
     headers:{"Content-Type":"application/json"},
     body:JSON.stringify({token,platform:Capacitor.getPlatform()})
    });
    if(response.ok){
     window.dispatchEvent(new Event("numelixa-push-ready"));
     return true;
    }
    if(response.status!==401)scheduleRetry();
    return false;
   }catch(error){
    console.error("[NUMELIXA PUSH REGISTER]",error);
    scheduleRetry();
    return false;
   }finally{tokenInFlight=false}
  };

  const getNativeToken=async()=>{
   try{
    const result=await NativePushToken.getToken();
    const token=String(result?.token||"").trim();
    if(token)await saveAndRegister(token);
    return token;
   }catch(error){
    console.error("[NUMELIXA NATIVE FCM TOKEN]",error);
    scheduleRetry();
    return "";
   }
  };

  const syncCurrentToken=async()=>{
   if(stopped)return;
   const token=String(localStorage.getItem(TOKEN_KEY)||"").trim();
   if(token)await saveAndRegister(token);
   await getNativeToken();
  };

  const showPermissionGate=()=>{
   if(document.getElementById("numelixa-notification-gate"))return;
   const gate=document.createElement("div");
   gate.id="numelixa-notification-gate";
   gate.innerHTML=`<div class="numelixa-notification-gate-backdrop"></div><section class="numelixa-notification-gate-card" role="dialog" aria-modal="true"><div class="numelixa-notification-gate-logo">N</div><div class="numelixa-notification-gate-icon">🔔</div><span class="eyebrow">NUMELIXA ALERTS</span><h2>Notifications are required</h2><p>Allow Android notifications so Numelixa can instantly notify you about SMS codes, purchases, wallet activity, security and important updates.</p><button id="numelixa-enable-notifications" type="button">Allow Notifications</button><small>You can manage this permission later in Android Settings.</small></section>`;
   document.body.appendChild(gate);
   document.getElementById("numelixa-enable-notifications")?.addEventListener("click",async()=>{
    if(!push||permissionInFlight)return;
    permissionInFlight=true;
    try{
     const result=await push.requestPermissions();
     if(result.receive==="granted"){
      gate.remove();
      await push.register();
      await syncCurrentToken();
     }
    }catch(error){console.error("[NUMELIXA PUSH PERMISSION]",error)}
    finally{permissionInFlight=false}
   });
  };

  const ensurePushPermission=async()=>{
   if(!push||stopped||permissionInFlight)return false;
   permissionInFlight=true;
   try{
    const current=await push.checkPermissions();
    if(current.receive==="granted"){
     document.getElementById("numelixa-notification-gate")?.remove();
     await push.register();
     await syncCurrentToken();
     return true;
    }
    const result=await push.requestPermissions();
    if(result.receive==="granted"){
     document.getElementById("numelixa-notification-gate")?.remove();
     await push.register();
     await syncCurrentToken();
     return true;
    }
    showPermissionGate();
    return false;
   }catch(error){
    console.error("[NUMELIXA PUSH PERMISSION]",error);
    showPermissionGate();
    return false;
   }finally{permissionInFlight=false}
  };

  (async()=>{
   try{
    const {PushNotifications}=await import("@capacitor/push-notifications");
    push=PushNotifications;

    const registration=await PushNotifications.addListener("registration",(event)=>{
     if(event?.value)void saveAndRegister(event.value);
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
     const url=String(event.notification?.data?.url||"/");
     window.location.href=url.startsWith("/")?url:"/";
    });
    cleanups.push(()=>action.remove());

    const refresh=()=>{
     void ensurePushPermission().then(()=>syncCurrentToken());
    };
    window.addEventListener("numelixa-auth-ready",refresh);
    window.addEventListener("online",refresh);
    window.addEventListener("focus",refresh);
    document.addEventListener("visibilitychange",refresh);
    cleanups.push(()=>{
     window.removeEventListener("numelixa-auth-ready",refresh);
     window.removeEventListener("online",refresh);
     window.removeEventListener("focus",refresh);
     document.removeEventListener("visibilitychange",refresh);
    });

    // Permission is requested when the APK opens. The token is only linked
    // to an account after /api/me confirms an authenticated email account.
    await ensurePushPermission();
    await syncCurrentToken();

    const heartbeat=window.setInterval(()=>{void syncCurrentToken()},30000);
    cleanups.push(()=>window.clearInterval(heartbeat));
   }catch(error){console.error("[NUMELIXA PUSH]",error)}
  })();

  return()=>{
   stopped=true;
   if(retryTimer)clearTimeout(retryTimer);
   document.getElementById("numelixa-notification-gate")?.remove();
   cleanups.forEach(fn=>{try{fn()}catch{}});
   document.documentElement.classList.remove("numelixa-native");
   document.body.classList.remove("numelixa-native");
  };
 },[]);
 return null;
}
