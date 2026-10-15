"use client";
import {useEffect} from "react";
import {Capacitor,registerPlugin} from "@capacitor/core";

const TOKEN_KEY="numelixa_fcm_token_v5";
const NativePushToken=registerPlugin<{getToken():Promise<{token?:string}>;getStatus():Promise<{tokenPresent?:boolean;tokenLength?:string|number;tokenError?:string;registrationStatus?:string;registrationResponse?:string;registrationAt?:number}>}>( "NumelixaPushToken");

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

  const saveAndRegister=async(token:string)=>{
   token=String(token||"").trim();
   if(token.length<20||stopped||tokenInFlight)return false;
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
    // A 401 is expected for the short window before login/session cookies are
    // ready. The server now stores the device as unlinked, and we keep retrying
    // so the same token becomes linked as soon as the account is authenticated.
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
    if(token){await saveAndRegister(token);return token;}
   }catch(error){
    console.error("[NUMELIXA NATIVE FCM TOKEN]",error);
   }

   // Capacitor's official registration callback is a second client-side
   // path. If the custom native bridge is unavailable, the callback token can
   // still reach the same backend endpoint.
   if(capacitorToken.length>=20){
    await saveAndRegister(capacitorToken);
    return capacitorToken;
   }

   scheduleRetry();
   return "";
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
   gate.innerHTML=`<div class="numelixa-notification-gate-backdrop"></div><section class="numelixa-notification-gate-card" role="dialog" aria-modal="true"><div class="numelixa-notification-gate-logo">N</div><div class="numelixa-notification-gate-icon">🔔</div><span class="eyebrow">NUMELIXA ALERTS</span><h2>Notifications are required</h2><p>Allow Android notifications so Numelixa can instantly notify you about SMS codes, purchases, wallet activity, security and important updates.</p><button id="numelixa-enable-notifications" type="button">Allow Notifications</button><button id="numelixa-open-notification-settings" type="button" style="margin-top:10px;background:transparent;border:1px solid rgba(130,210,240,.4);color:#d8f6ff">Open Android Settings</button><small>If Android has stopped showing the permission dialog, enable Numelixa notifications in Settings.</small></section>`;
   document.body.appendChild(gate);
   document.getElementById("numelixa-open-notification-settings")?.addEventListener("click",()=>{
    try{window.location.href="app-settings:"}catch{}
   });
   document.getElementById("numelixa-enable-notifications")?.addEventListener("click",async()=>{
    if(!push||permissionInFlight)return;
    permissionInFlight=true;
    try{
     const result=await push.requestPermissions();
     if(result.receive==="granted"){
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
   try{
    await push.createChannel({
     id:"numelixa",
     name:"Numelixa Notifications",
     description:"SMS codes, number orders, wallet activity and account security",
     importance:5,
     sound:"default",
     visibility:1
    });
    if(localNotifications){
     await localNotifications.createChannel({
      id:"numelixa",
      name:"Numelixa Notifications",
      description:"SMS codes, number orders, wallet activity and account security",
      importance:5,
      sound:"default",
      visibility:1
     });
    }
    channelReady=true;
   }catch(error){
    // Some Android/Capacitor versions do not expose channel management.
    // Keep registration running; FCM may fall back to the default channel.
    console.warn("[NUMELIXA NOTIFICATION CHANNEL] unavailable");
   }
  };

  const ensurePushPermission=async()=>{
   if(!push||stopped||permissionInFlight)return false;
   permissionInFlight=true;
   try{
    const current=await push.checkPermissions();
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
    const requested=await push.requestPermissions();
    if(requested.receive==="granted"){
     await ensureAndroidChannel();
     document.getElementById("numelixa-notification-gate")?.remove();
     await push.register();
     await syncCurrentToken();
     return true;
    }
    // Keep the app covered until the user grants permission or opens Settings.
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

    const registration=await PushNotifications.addListener("registration",(event)=>{
     if(event?.value){capacitorToken=String(event.value).trim();void saveAndRegister(capacitorToken);}
    });
    cleanups.push(()=>registration.remove());

    const registrationError=await PushNotifications.addListener("registrationError",(error)=>{
     console.error("[NUMELIXA FCM REGISTRATION]",error);
     scheduleRetry();
    });
    cleanups.push(()=>registrationError.remove());

    const received=await PushNotifications.addListener("pushNotificationReceived",async(event)=>{
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
      await localNotifications.schedule({notifications:[{
       id:notificationId,title,body,channelId:"numelixa",
       schedule:{at:new Date(Date.now()+250)},
       extra:{...data,url:String(data.url||"/")}
      }]});
     }catch{
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
      await getNativeToken();
      if(await isAuthenticated())await syncCurrentToken();
     }catch(error){console.error("[NUMELIXA PUSH AUTH SYNC]",error)}
    },2500);
    cleanups.push(()=>window.clearInterval(authPoll));

    // Token retrieval is independent from the permission dialog. If permission
    // was already granted in Android Settings, FCM getToken() runs immediately.
    // Start permission/token synchronization immediately. Token
    // retrieval is retried independently so a temporary Firebase/Play
    // Services startup delay does not permanently leave the device unregistered.
    await getNativeToken();
    await ensurePushPermission();
    await syncCurrentToken();
    try{
     const status=await NativePushToken.getStatus();
     console.log("[NUMELIXA FCM STATUS]",{tokenPresent:Boolean(status.tokenPresent),tokenLength:status.tokenLength,registrationStatus:status.registrationStatus});
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
