import {NextResponse} from "next/server";
import {collection} from "@/lib/mongo";

export const runtime="nodejs";
export const dynamic="force-dynamic";

export async function GET(req:Request){
  try{
    const headers=new Headers(req.headers);
    const country=(headers.get("x-vercel-ip-country")||headers.get("cf-ipcountry")||"").trim().toUpperCase();
    const device=(headers.get("x-numelixa-device")||"").trim().toLowerCase();
    const appVersion=(headers.get("x-numelixa-app-version")||"").trim().toLowerCase();
    const sdk=Number(headers.get("x-numelixa-android-sdk")||0);
    const saved=await (await collection<any>("settings")).findOne({_id:"mobileAccess"});
    const bannedCountries=Array.isArray(saved?.bannedCountries)?saved.bannedCountries.map((x:any)=>String(x).toUpperCase()):[];
    const blockedDevices=Array.isArray(saved?.blockedDevices)?saved.blockedDevices.map((x:any)=>String(x).trim().toLowerCase()).filter(Boolean):[];
    const blockedVersions=Array.isArray(saved?.blockedAppVersions)?saved.blockedAppVersions.map((x:any)=>String(x).trim().toLowerCase()).filter(Boolean):[];
    const blockedAndroidSdk=Array.isArray(saved?.blockedAndroidSdk)?saved.blockedAndroidSdk.map((x:any)=>Math.floor(Number(x))):[];
    const minSdk=Math.max(0,Math.floor(Number(saved?.minAndroidSdk||0)));
    const whatsapp=String(saved?.whatsapp||"252907868526").replace(/[^0-9]/g,"");
    let reason="";
    if(country&&bannedCountries.includes(country))reason="country";
    else if(device&&blockedDevices.some((x:string)=>device===x||device.includes(x)))reason="device";
    else if(appVersion&&blockedVersions.includes(appVersion))reason="version";
    else if(blockedAndroidSdk.includes(sdk))reason="android-version";
    else if(minSdk>0&&sdk>0&&sdk<minSdk)reason="android-version";
    return NextResponse.json({ok:true,allowed:!reason,reason,country,whatsapp,contactUrl:"https://wa.me/"+whatsapp},{headers:{"Cache-Control":"no-store"}});
  }catch{
    // A temporary policy-store outage must not lock every customer out.
    return NextResponse.json({ok:true,allowed:true,reason:"",country:"",whatsapp:"252907868526",contactUrl:"https://wa.me/252907868526"},{headers:{"Cache-Control":"no-store"}});
  }
}
