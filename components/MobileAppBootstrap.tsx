"use client";
import {useEffect} from "react";
import {Capacitor,registerPlugin} from "@capacitor/core";

const TOKEN_KEY="numelixa_fcm_token_v5";
const NativePushToken=registerPlugin<{getToken():Promise<{token?:string;deviceId?:string;appVersion?:string}>;requestNotificationPermission():Promise<{granted?:boolean;status?:string}>;openNotificationSettings():Promise<{opened?:boolean}>;getStatus():Promise<{tokenPresent?:boolean;tokenLength?:string|number;tokenError?:string;registrationStatus?:string;registrationResponse?:string;registrationAt?:number;deviceId?:string;appVersion?:string;permission?:string}>}>( "NumelixaPushToken");

export default function MobileAppBootstrap(){
 useEffect(()=>{
  if(!Capacitor.isNativePlatform())return;
  document.documentElement.classList.add("numelixa-native");
  document.body.classList.add("numelixa-native");

  // Premium first-launch cover while the remote app shell finishes rendering.
  if(!document.getElementById("numelixa-native-splash")){
   const splash=document.createElement("div");
   splash.id="numelixa-native-splash";
   splash.innerHTML=`<style>
    #numelixa-native-splash{position:fixed;inset:0;z-index:2147483000;display:flex;align-items:center;justify-content:center;overflow:hidden;background:radial-gradient(ellipse at 50% 20%,#164d68 0%,#0a273b 38%,#04111f 78%);color:#f3fdff;font-family:Inter,Roboto,system-ui,sans-serif;transition:opacity .55s ease,visibility .55s ease}
    #numelixa-native-splash:before,#numelixa-native-splash:after{content:"";position:absolute;width:340px;height:340px;border-radius:50%;border:1px solid rgba(61,232,220,.15);animation:numelixa-splash-orbit 9s linear infinite}
    #numelixa-native-splash:after{width:265px;height:265px;border-color:rgba(45,158,255,.23);animation-duration:7s;animation-direction:reverse}
    #numelixa-native-splash .nsl-card{position:relative;z-index:1;width:min(86vw,350px);text-align:center}
    #numelixa-native-splash .nsl-logo{width:76px;height:76px;margin:0 auto 18px;border-radius:25px;display:grid;place-items:center;font-size:38px;font-weight:950;color:#04222c;background:linear-gradient(145deg,#5df5dd,#14a9ca 65%,#2879ff);box-shadow:0 0 55px rgba(35,219,221,.28);animation:numelixa-splash-breathe 2.5s ease-in-out infinite}
    #numelixa-native-splash .nsl-world{height:116px;width:116px;margin:0 auto 17px;border-radius:50%;display:grid;place-items:center;background:radial-gradient(circle at 35% 30%,rgba(36,215,216,.22),rgba(12,59,89,.05) 65%);border:1px solid rgba(100,235,242,.26);box-shadow:inset 0 0 35px rgba(41,206,222,.12),0 0 35px rgba(25,154,230,.12)}
    #numelixa-native-splash .nsl-world svg{width:94px;height:94px;animation:numelixa-splash-orbit 22s linear infinite}
    #numelixa-native-splash .nsl-title{font-size:31px;font-weight:900;letter-spacing:-1.2px}
    #numelixa-native-splash .nsl-title span{color:#5debd9}
    #numelixa-native-splash .nsl-tag{margin-top:9px;font-size:11px;letter-spacing:2.5px;font-weight:800;color:#a2dce7}
    #numelixa-native-splash .nsl-sub{margin:17px auto 0;max-width:270px;color:#a7c7d5;font-size:13px;line-height:1.6}
    #numelixa-native-splash .nsl-pills{display:flex;justify-content:center;gap:7px;margin-top:20px;flex-wrap:wrap}
    #numelixa-native-splash .nsl-pills span{font-size:10px;color:#c7f9f5;background:rgba(33,143,162,.17);border:1px solid rgba(91,223,222,.18);border-radius:999px;padding:7px 10px}
    #numelixa-native-splash .nsl-loader{width:106px;height:3px;margin:28px auto 0;border-radius:9px;background:#16384d;overflow:hidden}
    #numelixa-native-splash .nsl-loader i{display:block;width:40%;height:100%;border-radius:9px;background:linear-gradient(90deg,#38e8d2,#3c9eff);animation:numelixa-splash-load 1.35s ease-in-out infinite}
    #numelixa-native-splash.nsl-hide{opacity:0;visibility:hidden;pointer-events:none}
    @keyframes numelixa-splash-orbit{to{transform:rotate(360deg)}}
    @keyframes numelixa-splash-breathe{0%,100%{transform:translateY(0) scale(1)}50%{transform:translateY(-4px) scale(1.035)}}
    @keyframes numelixa-splash-load{0%{transform:translateX(-110%)}100%{transform:translateX(270%)}}
    @media(prefers-reduced-motion:reduce){#numelixa-native-splash *,#numelixa-native-splash:before,#numelixa-native-splash:after{animation:none!important}}
   </style><div class="nsl-card"><div class="nsl-world"><svg viewBox="0 0 100 100" fill="none" aria-hidden="true"><circle cx="50" cy="50" r="39" stroke="#56e6df" stroke-opacity=".8"/><ellipse cx="50" cy="50" rx="18" ry="39" stroke="#56e6df" stroke-opacity=".55"/><ellipse cx="50" cy="50" rx="38" ry="14" stroke="#56e6df" stroke-opacity=".55"/><path d="M12 50h76M19 32h62M19 68h62" stroke="#56e6df" stroke-opacity=".5"/><path d="M24 29l11 3 6 10-4 8 9 6 2 14-9 9M60 15l-2 12 11 7-2 10 10 8-4 10M45 12l6 9-8 7" stroke="#63e9de" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="65" cy="38" r="3" fill="#67f4d6"/><circle cx="36" cy="54" r="3" fill="#57aaff"/><path d="M36 54Q50 34 65 38" stroke="#72dfff" stroke-dasharray="3 4"/></svg></div><div class="nsl-title">Numelixa<span>.</span></div><div class="nsl-tag">GLOBAL VIRTUAL NUMBERS</div><p class="nsl-sub">Your connected world for virtual numbers, SMS verification and secure account access.</p><div class="nsl-pills"><span>✦ Virtual Numbers</span><span>◉ Global SMS</span><span>⌁ Secure Access</span></div><div class="nsl-loader"><i></i></div></div>`;
   document.body.appendChild(splash);
   // Keep the startup cover until the app reaches Home or Dashboard.
   // A safety timeout avoids blocking sign-in if the remote app cannot navigate.
   const splashStarted=Date.now();
   let splashRemoved=false;
   let routePoll:number|null=null;
   const hideSplash=()=>{
    if(splashRemoved)return;
    splashRemoved=true;
    splash.classList.add("nsl-hide");
    window.setTimeout(()=>splash.remove(),650);
    window.removeEventListener("popstate",checkSplashRoute);
    window.removeEventListener("numelixa-route-change",checkSplashRoute);
    if(routePoll)window.clearInterval(routePoll);
   };
   const checkSplashRoute=()=>{
    const path=window.location.pathname.replace(/\/+$/,"")||"/";
    const isHomeOrDashboard=path==="/"||path==="/home"||path==="/dashboard";
    if(isHomeOrDashboard&&Date.now()-splashStarted>=1700)hideSplash();
   };
   window.addEventListener("popstate",checkSplashRoute);
   window.addEventListener("numelixa-route-change",checkSplashRoute);
   routePoll=window.setInterval(checkSplashRoute,150);
   window.setTimeout(checkSplashRoute,1750);
   window.setTimeout(hideSplash,6500);
  }

  let stopped=false;
  let retryTimer:ReturnType<typeof setTimeout>|null=null;
  let permissionInFlight=false;
  let push:any=null;
  let localNotifications:any=null;
  let channelReady=false;
  const seenForegroundPushes=new Set<string>();
  let capacitorToken="";
  let tokenInFlight=false;
  let registeredAccountToken="";
  const cleanups:Array<()=>void>=[];

  const isAuthenticated=async()=>{
   try{
    const r=await fetch("/api/me",{cache:"no-store",credentials:"include"});
    if(!r.ok)return false;
    const data=await r.json().catch(()=>null);
    return Boolean(data?.user?.id);
   }catch{return false}
  };

  const scheduleRetry=()=>{
   if(stopped||retryTimer)return;
   retryTimer=setTimeout(()=>{retryTimer=null;void syncCurrentToken()},10000);
  };

  const saveAndRegister=async(token:string,deviceId?:string,appVersion?:string)=>{
   token=String(token||"").trim();
   if(token.length<20||stopped||tokenInFlight)return false;
   // Link push tokens after any email account has an authenticated session.
   // Never create anonymous/unlinked device records at app startup.
   let account:any=null;
   try{
    const me=await fetch("/api/me",{cache:"no-store",credentials:"include"});
    if(!me.ok)return false;
    const payload=await me.json().catch(()=>null);
    account=payload?.user;
   }catch{return false}
   if(!account?.id||!String(account?.email||"").trim().includes("@")){
    console.info("[NUMELIXA FCM_WAITING_FOR_EMAIL_LOGIN]");
    return false;
   }
   try{localStorage.setItem(TOKEN_KEY,token)}catch{}
   const registrationKey=String(account.id)+":"+token;
   if(registeredAccountToken===registrationKey)return true;
   tokenInFlight=true;
   try{
    const response=await fetch("/api/notifications/register",{
     method:"POST",credentials:"include",cache:"no-store",
     headers:{"Content-Type":"application/json"},
     body:JSON.stringify({token,platform:Capacitor.getPlatform(),deviceId:deviceId||"",appVersion:appVersion||""})
    });
    if(response.ok){
     const result=await response.json().catch(()=>null);
     registeredAccountToken=registrationKey;
     console.info("[NUMELIXA FCM_TOKEN_REGISTERED]",{linked:Boolean(result?.linked),httpStatus:response.status});
     window.dispatchEvent(new Event("numelixa-push-ready"));
     return true;
    }
    console.error("[NUMELIXA FCM_REGISTER_HTTP_FAILURE]",{status:response.status});
    scheduleRetry();
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
    if(token){console.info("[NUMELIXA FCM_TOKEN_RECEIVED]",{tokenPresent:true,tokenLength:token.length});await saveAndRegister(token,result.deviceId,result.appVersion);return token;}
   }catch(error){
    console.error("[NUMELIXA NATIVE FCM TOKEN]",error);
   }

   // Capacitor's official registration callback is a second client-side
   // path. If the custom native bridge is unavailable, the callback token can
   // still reach the same backend endpoint.
   if(capacitorToken.length>=20){
    const status=await NativePushToken.getStatus().catch(()=>({} as any));
    await saveAndRegister(capacitorToken,status.deviceId,status.appVersion);
    return capacitorToken;
   }

   scheduleRetry();
   return "";
  };

  const syncCurrentToken=async()=>{
   if(stopped)return;
   // Email login is the only point at which a device is linked.
   let authenticated=false;
   try{
    const me=await fetch("/api/me",{cache:"no-store",credentials:"include"});
    const data=me.ok?await me.json().catch(()=>null):null;
    authenticated=Boolean(data?.user?.id&&String(data.user.email||"").trim().includes("@"));
   }catch{}
   if(!authenticated)return;
   const cached=String(localStorage.getItem(TOKEN_KEY)||"").trim();
   const current=await getNativeToken();
   if(!current&&cached)await saveAndRegister(cached);
  };

  const showPermissionGate=()=>{
   if(document.getElementById("numelixa-notification-gate"))return;
   const gate=document.createElement("div");
   gate.id="numelixa-notification-gate";
   gate.style.cssText="position:fixed;inset:0;z-index:2147483000;pointer-events:none;background:transparent";
   gate.innerHTML=`<div class="numelixa-notification-gate-backdrop" style="display:none"></div><section class="numelixa-notification-gate-card" role="dialog" aria-modal="false" style="position:fixed;left:16px;right:16px;top:auto;bottom:16px;transform:none;max-width:440px;margin:0 auto;z-index:2147483001;pointer-events:auto"><div class="numelixa-notification-gate-logo">N</div><div class="numelixa-notification-gate-icon">🔔</div><span class="eyebrow">NUMELIXA ALERTS</span><h2>Enable notifications</h2><p>Allow alerts for SMS codes, purchases, wallet activity and account security. You can keep using Numelixa without enabling them.</p><button id="numelixa-enable-notifications" type="button">Allow Notifications</button><button id="numelixa-open-notification-settings" type="button" style="margin-top:10px;background:transparent;border:1px solid rgba(130,210,240,.4);color:#d8f6ff">Open Android Settings</button><button id="numelixa-dismiss-notifications" type="button" style="margin-top:8px;background:transparent;border:0;color:#a7b7d0">Not now</button></section>`;
   document.body.appendChild(gate);
   document.getElementById("numelixa-dismiss-notifications")?.addEventListener("click",()=>gate.remove());
   document.getElementById("numelixa-open-notification-settings")?.addEventListener("click",()=>{
    void NativePushToken.openNotificationSettings().catch(error=>console.error("[NUMELIXA NOTIFICATION SETTINGS]",error));
   });
   document.getElementById("numelixa-enable-notifications")?.addEventListener("click",async()=>{
    if(!push||permissionInFlight)return;
    permissionInFlight=true;
    try{
     const result=await NativePushToken.requestNotificationPermission();
     if(result.granted){
      await ensureAndroidChannel();
      gate.remove();
      await push.register();
      await syncCurrentToken();
     }
    }catch(error){console.error("[NUMELIXA PUSH PERMISSION]",error)}
    finally{permissionInFlight=false}
   });
  };

  const ensureAndroidChannel=async()=>{
   if(channelReady||!push||Capacitor.getPlatform()!=="android")return;
   const channels=[
    {id:"general",name:"General",description:"General Numelixa updates",importance:4},
    {id:"security",name:"Security",description:"Account security and login alerts",importance:5},
    {id:"verification",name:"Verification",description:"SMS verification and order codes",importance:5},
    {id:"admin",name:"Admin updates",description:"Important Numelixa announcements",importance:5}
   ];
   try{
    for(const channel of channels){
     await push.createChannel({...channel,sound:"default",visibility:1,vibration:true});
     if(localNotifications)await localNotifications.createChannel({...channel,sound:"default",visibility:1,vibration:true});
    }
    channelReady=true;
    console.info("[NUMELIXA FCM_CHANNELS_READY]",{channels:channels.map(x=>x.id)});
   }catch(error){
    console.error("[NUMELIXA FCM_CHANNEL_FAILURE]",error instanceof Error?error.message:"Unable to create Android notification channels");
   }
  };

  const ensurePushPermission=async()=>{
   if(!push||stopped||permissionInFlight)return false;
   permissionInFlight=true;
   try{
    const current=await push.checkPermissions();
    console.info("FCM_PERMISSION="+(current.receive==="granted"?"granted":"denied"));
    if(current.receive==="granted"){
     await ensureAndroidChannel();
     document.getElementById("numelixa-notification-gate")?.remove();
     await push.register();
     await syncCurrentToken();
     return true;
    }
    // Request Android's runtime notification permission automatically on first
    // launch. This is the single permission request path (the native activity
    // must not race it with a second dialog).
    // MainActivity owns the first-launch Android runtime prompt directly.
    // Do not issue a second request from WebView startup (it can race the
    // Activity dialog and leave the user with no visible prompt).
    console.info("FCM_PERMISSION=pending-or-denied; native Activity requests it");
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
    const {LocalNotifications}=await import("@capacitor/local-notifications");
    push=PushNotifications;
    localNotifications=LocalNotifications;

    const registration=await PushNotifications.addListener("registration",async(event)=>{
     if(event?.value){
      capacitorToken=String(event.value).trim();
      const status=await NativePushToken.getStatus().catch(()=>({} as any));
      console.info("[NUMELIXA FCM_TOKEN_REFRESHED]",{tokenPresent:Boolean(capacitorToken),tokenLength:capacitorToken.length});
      void saveAndRegister(capacitorToken,status.deviceId,status.appVersion);
     }
    });
    cleanups.push(()=>registration.remove());

    const registrationError=await PushNotifications.addListener("registrationError",(error)=>{
     console.error("[NUMELIXA FCM REGISTRATION]",error);
     scheduleRetry();
    });
    cleanups.push(()=>registrationError.remove());

    const received=await PushNotifications.addListener("pushNotificationReceived",async(event)=>{
     console.info("[NUMELIXA FCM_MESSAGE_RECEIVED]",{hasTitle:Boolean(event?.title),hasBody:Boolean(event?.body),dataType:String(event?.data?.type||"general")});
     window.dispatchEvent(new Event("numelixa-notification"));
     // Android FCM notification payloads are displayed by the system while
     // backgrounded. Only this foreground callback schedules a local alert.
     const title=String(event?.title||"Numelixa");
     const body=String(event?.body||"").trim();
     const data=event?.data||{};
     const pushKey=String(event?.id||[title,body,data.url||""].join("|"));
     if(!body||seenForegroundPushes.has(pushKey))return;
     seenForegroundPushes.add(pushKey);
     window.setTimeout(()=>seenForegroundPushes.delete(pushKey),60000);
     try{
      const rawId=String(event?.id||"").replace(/\D/g,"").slice(-8);
      const notificationId=Number(rawId)||Math.max(1,Date.now()%2147483647);
      const messageType=String(data.type||"").toLowerCase();
     const channelId=["sms","verification","verification_code"].includes(messageType)?"verification":["security","login","login_approval","account_security"].includes(messageType)?"security":["admin","announcement","push_test"].includes(messageType)?"admin":"general";
     await localNotifications.schedule({notifications:[{
       id:notificationId,title,body,channelId,smallIcon:"ic_stat_numelixa",
       schedule:{at:new Date(Date.now()+250)},
       extra:{...data,url:String(data.url||"/")}
      }]});
      console.info("[NUMELIXA FCM_NOTIFICATION_DISPLAYED]",{channelId,notificationId});
     }catch(error){
      console.error("[NUMELIXA FCM_NOTIFICATION_DISPLAY_FAILURE]",error instanceof Error?error.message:"Local notification scheduling failed");
      // In-app notification events still fire if local alert presentation fails.
     }
    });
    cleanups.push(()=>received.remove());

    const localAction=await LocalNotifications.addListener("localNotificationActionPerformed",(event)=>{
     const url=String(event?.notification?.extra?.url||"/");
     window.location.href=url.startsWith("/")&&!url.startsWith("//")&&!url.includes("\\")?url:"/";
    });
    cleanups.push(()=>localAction.remove());

    const action=await PushNotifications.addListener("pushNotificationActionPerformed",(event)=>{
     const url=String(event.notification?.data?.url||"/");
     // Accept only same-origin relative app paths; do not let payload data
     // turn a notification tap into an external redirect.
     window.location.href=url.startsWith("/")&&!url.startsWith("//")&&!url.includes("\\")?url:"/";
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

    // Keep syncing both before and after login. The backend accepts an
    // authenticated token immediately and also stores an unlinked token when
    // the session is not ready yet.
    const authPoll=window.setInterval(async()=>{
     if(stopped)return;
     try{
      if(await isAuthenticated())await syncCurrentToken();
     }catch(error){console.error("[NUMELIXA PUSH AUTH SYNC]",error)}
    },5000);
    cleanups.push(()=>window.clearInterval(authPoll));

    // Ask for notification permission FIRST. Never wait for Firebase token
    // retrieval or a backend/network request before displaying Android's
    // first-launch permission dialog; either operation can stall on startup.
    // Token acquisition/registration is retried independently after permission
    // handling, so it cannot suppress the system permission prompt.
    await ensurePushPermission();
    if (!stopped) {
     void getNativeToken();
     void syncCurrentToken();
    }
    try{
     const status=await NativePushToken.getStatus();
     console.log("[NUMELIXA FCM STATUS]",{tokenPresent:Boolean(status.tokenPresent),tokenLength:status.tokenLength,registrationStatus:status.registrationStatus,permission:status.permission,deviceIdentityPresent:Boolean(status.deviceId)});
    }catch(error){
     console.warn("[NUMELIXA FCM STATUS]",error);
    }

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
