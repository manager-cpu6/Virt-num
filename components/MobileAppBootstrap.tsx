"use client";
import {useEffect} from "react";
import {Capacitor} from "@capacitor/core";

const TOKEN_KEY="numelixa_fcm_token_v2_4_1";
const APP_VERSION="2.4.1";

export default function MobileAppBootstrap(){
 useEffect(()=>{
  if(!Capacitor.isNativePlatform())return;
  document.documentElement.classList.add("numelixa-native");
  document.body.classList.add("numelixa-native");
  let stopped=false;let retryTimer:ReturnType<typeof setTimeout>|null=null;let syncInFlight=false;let permissionInFlight=false;let push:any=null;
  const cleanups:Array<()=>void>=[];

  const scheduleRetry=()=>{if(stopped||retryTimer)return;retryTimer=setTimeout(()=>{retryTimer=null;void syncStoredToken()},8000)};

  const syncToken=async(token:string)=>{
   if(!token||token.length<20||stopped||syncInFlight)return false;
   syncInFlight=true;
   try{
    localStorage.setItem(TOKEN_KEY,token);
    const response=await fetch("/api/notifications/register",{method:"POST",credentials:"include",cache:"no-store",headers:{"Content-Type":"application/json"},body:JSON.stringify({token,platform:Capacitor.getPlatform()})});
    if(response.ok){window.dispatchEvent(new Event("numelixa-push-ready"));return true}
    scheduleRetry();return false;
   }catch(error){console.error("[NUMELIXA PUSH REGISTER]",error);scheduleRetry();return false}
   finally{syncInFlight=false}
  };

  const syncStoredToken=async()=>{
   try{const token=localStorage.getItem(TOKEN_KEY);if(token)await syncToken(token)}catch{}
  };

  const showPermissionGate=()=>{
   if(document.getElementById("numelixa-notification-gate"))return;
   const gate=document.createElement("div");
   gate.id="numelixa-notification-gate";
   gate.innerHTML=`<div class="numelixa-notification-gate-backdrop"></div><section class="numelixa-notification-gate-card" role="dialog" aria-modal="true"><div class="numelixa-notification-gate-logo">N</div><div class="numelixa-notification-gate-icon">🔔</div><span class="eyebrow">NUMELIXA ALERTS</span><h2>Notifications are required</h2><p>Turn on Android notifications to use Numelixa. You will receive real phone notifications for SMS codes, wallet payments, number status, admin updates and other important account events.</p><button id="numelixa-enable-notifications" type="button">Allow Notifications</button><small>Numelixa will not continue until notifications are enabled.</small></section>`;
   document.body.appendChild(gate);
   document.getElementById("numelixa-enable-notifications")?.addEventListener("click",async()=>{
    if(!push||permissionInFlight)return;permissionInFlight=true;
    try{const result=await push.requestPermissions();if(result.receive==="granted"){gate.remove();await push.register();await syncStoredToken()}}catch(error){console.error("[NUMELIXA PUSH PERMISSION]",error)}finally{permissionInFlight=false}
   });
  };

  const removePermissionGate=()=>document.getElementById("numelixa-notification-gate")?.remove();

  const ensurePushPermission=async()=>{
   if(!push||stopped||permissionInFlight)return false;permissionInFlight=true;
   try{
    const current=await push.checkPermissions();
    if(current.receive==="granted"){removePermissionGate();await push.register();await syncStoredToken();return true}
    const result=await push.requestPermissions();
    if(result.receive==="granted"){removePermissionGate();await push.register();await syncStoredToken();return true}
    showPermissionGate();return false;
   }catch(error){console.error("[NUMELIXA PUSH PERMISSION]",error);showPermissionGate();return false}
   finally{permissionInFlight=false}
  };

  (async()=>{
   try{
    const {PushNotifications}=await import("@capacitor/push-notifications");push=PushNotifications;
    if(Capacitor.getPlatform()==="android"){try{await PushNotifications.createChannel({id:"numelixa",name:"Numelixa",description:"Important Numelixa alerts",importance:5,sound:"default",vibration:true})}catch(error){console.warn("[NUMELIXA PUSH CHANNEL]",error)}}
    const registration=await PushNotifications.addListener("registration",(event)=>{if(event?.value)void syncToken(event.value)});cleanups.push(()=>registration.remove());
    const registrationError=await PushNotifications.addListener("registrationError",(error)=>{console.error("[NUMELIXA FCM REGISTRATION]",error);scheduleRetry()});cleanups.push(()=>registrationError.remove());
    const received=await PushNotifications.addListener("pushNotificationReceived",()=>window.dispatchEvent(new Event("numelixa-notification")));cleanups.push(()=>received.remove());
    const action=await PushNotifications.addListener("pushNotificationActionPerformed",(event)=>{const url=String(event.notification?.data?.url||"/");window.location.href=url.startsWith("/")?url:"/"});cleanups.push(()=>action.remove());

    const retry=()=>{void syncStoredToken();window.setTimeout(()=>void syncStoredToken(),1000);window.setTimeout(()=>void syncStoredToken(),3000);window.setTimeout(()=>void syncStoredToken(),10000)};window.addEventListener("numelixa-auth-ready",retry);window.addEventListener("online",retry);window.addEventListener("focus",retry);document.addEventListener("visibilitychange",retry);
    cleanups.push(()=>{window.removeEventListener("numelixa-auth-ready",retry);window.removeEventListener("online",retry);window.removeEventListener("focus",retry);document.removeEventListener("visibilitychange",retry)});

    await ensurePushPermission();
    await syncStoredToken();
    const heartbeat=window.setInterval(()=>{void syncStoredToken()},10000);cleanups.push(()=>window.clearInterval(heartbeat));
   }catch(error){console.error("[NUMELIXA PUSH]",error)}
  })();

  return()=>{stopped=true;if(retryTimer)clearTimeout(retryTimer);removePermissionGate();cleanups.forEach(fn=>{try{fn()}catch{}});document.documentElement.classList.remove("numelixa-native");document.body.classList.remove("numelixa-native")};
 },[]);
 return null;
}