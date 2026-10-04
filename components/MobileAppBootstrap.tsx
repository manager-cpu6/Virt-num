"use client";
import {useEffect} from "react";
import {Capacitor} from "@capacitor/core";

export default function MobileAppBootstrap(){
  useEffect(()=>{
    if(!Capacitor.isNativePlatform()) return;

    document.documentElement.classList.add("numelixa-native");
    document.body.classList.add("numelixa-native");

    let removed = false;
    const cleanups: Array<()=>void> = [];

    (async()=>{
      try{
        const {PushNotifications} = await import("@capacitor/push-notifications");

        const permission = await PushNotifications.checkPermissions();
        const result = permission.receive === "granted"
          ? permission
          : await PushNotifications.requestPermissions();

        if(result.receive !== "granted") return;

        // Register listeners BEFORE register() so a fast Android FCM
        // registration event cannot be missed.
        const registration = new Promise<any>((resolve,reject)=>{
          let done = false;
          const finish = (value:any)=>{
            if(done) return;
            done = true;
            resolve(value);
          };
          PushNotifications.addListener("registration", finish).then(h=>cleanups.push(()=>h.remove()));
          PushNotifications.addListener("registrationError", (err)=>{
            if(!done){done=true;reject(err);}
          }).then(h=>cleanups.push(()=>h.remove()));
          setTimeout(()=>finish(null), 10000);
        });

        await PushNotifications.register();
        const token = await registration;

        if(token?.value){
          await fetch("/api/notifications/register",{
            method:"POST",
            headers:{"Content-Type":"application/json"},
            body:JSON.stringify({
              token: token.value,
              platform: Capacitor.getPlatform()
            })
          });
        }

        const received = await PushNotifications.addListener(
          "pushNotificationReceived",
          ()=>window.dispatchEvent(new Event("numelixa-notification"))
        );
        cleanups.push(()=>received.remove());

        const action = await PushNotifications.addListener(
          "pushNotificationActionPerformed",
          (event)=>{
            const url = String(event.notification?.data?.url || "/notifications");
            window.location.href = url.startsWith("/") ? url : "/notifications";
          }
        );
        cleanups.push(()=>action.remove());
      }catch(error){
        console.error("[NUMELIXA PUSH]", error);
      }
    })();

    return()=>{
      if(removed) return;
      removed = true;
      cleanups.forEach(fn=>{try{fn()}catch{}});
      document.documentElement.classList.remove("numelixa-native");
      document.body.classList.remove("numelixa-native");
    };
  },[]);

  return null;
}
