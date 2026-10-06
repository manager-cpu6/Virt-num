"use client";
import {useEffect} from "react";
import {Capacitor} from "@capacitor/core";

const TOKEN_KEY="numelixa_fcm_token_v3_0_0";
const TOKEN_SYNC_KEY="numelixa_fcm_token_last_sync";

export default function MobileAppBootstrap(){
 useEffect(()=>{
  if(!Capacitor.isNativePlatform())return;

  document.documentElement.classList.add("numelixa-native");
  document.body.classList.add("numelixa-native");

  let stopped=false;
  let push:any=null;
  let localNotifications:any=null;
  let syncInFlight=false;
  let permissionInFlight=false;
  let retryTimer:ReturnType<typeof setTimeout>|null=null;
  let registrationAttempts=0;
  let lastNativeToken="";
  const cleanups:Array<()=>void>=[];

  const scheduleRetry=()=>{
   registrationAttempts++;
   if(registrationAttempts>100)return;
   if(stopped||retryTimer)return;
   retryTimer=setTimeout(()=>{
    retryTimer=null;
    void ensurePushPermission();
    void syncStoredToken(true);
   },5000);
  };

  const syncToken=async(token:string,force=false)=>{
   const clean=String(token||"").trim();
   if(!clean||clean.length<20||stopped||syncInFlight)return false;
   const previous=localStorage.getItem(TOKEN_KEY)||"";
   const lastSync=Number(localStorage.getItem(TOKEN_SYNC_KEY)||"0");
   if(!force&&previous===clean&&Date.now()-lastSync<6*60*60*1000)return true;

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
     localStorage.setItem(TOKEN_SYNC_KEY,String(Date.now()));
     registrationAttempts=0;
     window.dispatchEvent(new Event("numelixa-push-ready"));
     return true;
    }

    console.warn("[NUMELIXA PUSH REGISTER] Server returned",response.status);
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

  const syncStoredToken=async(force=false)=>{
   try{
    const token=localStorage.getItem(TOKEN_KEY);
    if(token)await syncToken(token,force);
   }catch(error){
    console.error("[NUMELIXA PUSH STORED TOKEN]",error);
   }
  };

  const ensurePushPermission=async()=>{
   if(!push||stopped)return false;
   if(permissionInFlight)return false;
   permissionInFlight=true;
   try{
    let current=await push.checkPermissions();
    // Android 13+ requires POST_NOTIFICATIONS to be granted at runtime.
    // Never assume another native screen will request it: the Capacitor
    // push plugin is the source of truth for this permission.
    if(current.receive!=="granted"){
      current=await push.requestPermissions();
    }
    if(current.receive!=="granted"){
      console.warn("[NUMELIXA PUSH PERMISSION] Notifications are not granted.");
      return false;
    }
    await push.register();
    return true;
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
   void syncStoredToken(true);
   window.setTimeout(()=>void syncStoredToken(true),1000);
   window.setTimeout(()=>void syncStoredToken(true),3000);
  };

  (async()=>{
   try{
    const {PushNotifications}=await import("@capacitor/push-notifications");
    push=PushNotifications;
    try{
      const module=await import("@capacitor/local-notifications");
      localNotifications=module.LocalNotifications;
      await localNotifications.createChannel({id:"numelixa",name:"Numelixa",description:"Important Numelixa alerts",importance:5,sound:"default",vibration:true});
    }catch(error){console.warn("[NUMELIXA LOCAL NOTIFICATIONS]",error);}

    // Native fallback: obtain the Firebase token directly from Android.
    // This bypasses timing issues where Capacitor's registration event can
    // fire before the WebView/auth lifecycle is ready.
    try{
      const {registerPlugin}=await import("@capacitor/core");
      const NativePushToken:any=registerPlugin("NumelixaPushToken");
      const nativeToken=await NativePushToken.getToken();
      const value=String(nativeToken?.token||"").trim();
      if(value && value!==lastNativeToken){
       lastNativeToken=value;
       await syncToken(value);
      }
    }catch(error){
      console.warn("[NUMELIXA NATIVE FCM TOKEN]",error);
    }

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

    const received=await PushNotifications.addListener("pushNotificationReceived",async(notification:any)=>{
     window.dispatchEvent(new Event("numelixa-notification"));
     const pushData=notification?.data||{};
     if(String(pushData?.type||"")==="login_approval"&&pushData?.approvalId){
      window.dispatchEvent(new CustomEvent("numelixa-login-approval",{detail:{
       type:"login_approval",
       approvalId:String(pushData.approvalId),
       device:String(pushData.device||"Browser"),
       browser:String(pushData.browser||"Browser"),
       city:String(pushData.city||""),
       country:String(pushData.country||"")
      }}));
     }
     try{
      if(localNotifications)await localNotifications.schedule({notifications:[{id:Math.floor(Date.now()%2147483000),title:String(notification?.title||"Numelixa"),body:String(notification?.body||""),channelId:"numelixa",sound:"default",extra:notification?.data||{}}]});
     }catch(error){console.warn("[NUMELIXA FOREGROUND NOTIFICATION]",error);}
    });
    cleanups.push(()=>received.remove());

    try{
      if(localNotifications){
        const localAction=await localNotifications.addListener("localNotificationActionPerformed",(event:any)=>{const raw=String(event.notification?.extra?.url||"/");window.location.href=raw.startsWith("/")?raw:"/";});
        cleanups.push(()=>localAction.remove());
      }
    }catch(error){console.warn("[NUMELIXA LOCAL ACTION]",error);}
    const action=await PushNotifications.addListener("pushNotificationActionPerformed",(event:any)=>{
     const data=event?.notification?.data||{};
     if(String(data?.type||"")==="login_approval"&&data?.approvalId){
      try{localStorage.setItem("numelixa_pending_login_approval",JSON.stringify({type:"login_approval",approvalId:String(data.approvalId),device:String(data.device||"Browser"),browser:String(data.browser||"Browser"),city:String(data.city||""),country:String(data.country||"")}));}catch{}
      window.dispatchEvent(new CustomEvent("numelixa-login-approval",{detail:{
       type:"login_approval",
       approvalId:String(data.approvalId),
       device:String(data.device||"Browser"),
       browser:String(data.browser||"Browser"),
       city:String(data.city||""),
       country:String(data.country||"")
      }}));
      return;
     }
     const raw=String(data?.url||"/");
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

    // Register FCM immediately. This works even before login.
    // After login, the same token is rebound to the user's account.
    await ensurePushPermission();
    await syncStoredToken();

    const heartbeat=window.setInterval(async()=>{
     void ensurePushPermission();
     void syncStoredToken();
     // Re-read Firebase's current native token so token rotation is repaired
     // even if the Capacitor registration event is missed.
     try{
      const {registerPlugin}=await import("@capacitor/core");
      const NativePushToken:any=registerPlugin("NumelixaPushToken");
      const nativeToken=await NativePushToken.getToken();
      const value=String(nativeToken?.token||"").trim();
      if(value && value!==lastNativeToken){
       lastNativeToken=value;
       await syncToken(value);
      }
     }catch{}
    },6*60*60*1000);
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
