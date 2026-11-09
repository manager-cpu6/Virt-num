import {NextResponse} from "next/server";
import {requireAdmin} from "@/lib/auth";
import {collection} from "@/lib/mongo";

export const runtime="nodejs";
export const dynamic="force-dynamic";

const normalizeList=(value:unknown,max:number)=>Array.isArray(value)
  ? Array.from(new Set(value.map(x=>String(x||"").trim()).filter(Boolean))).slice(0,max)
  : [];

export async function GET(){
  try{
    await requireAdmin();
    const saved=await (await collection<any>("settings")).findOne({_id:"mobileAccess"});
    return NextResponse.json({ok:true,settings:{
      bannedCountries:normalizeList(saved?.bannedCountries,260),
      blockedDevices:normalizeList(saved?.blockedDevices,100),
      blockedAppVersions:normalizeList(saved?.blockedAppVersions,100),
      blockedAndroidSdk:Array.isArray(saved?.blockedAndroidSdk)?saved.blockedAndroidSdk.map((x:any)=>Math.floor(Number(x))).filter((x:number)=>x>0&&x<100):[],
      minAndroidSdk:Math.max(0,Math.floor(Number(saved?.minAndroidSdk||0))),
      minAppVersionCode:Math.max(0,Math.floor(Number(saved?.minAppVersionCode??15))),
      whatsapp:String(saved?.whatsapp||"252907868526")
    }},{headers:{"Cache-Control":"no-store"}});
  }catch(error){
    const message=error instanceof Error?error.message:"";
    const status=message==="AUTH_REQUIRED"||message==="ADMIN_REQUIRED"?401:500;
    return NextResponse.json({ok:false,error:status===401?"Unauthorized":"Unable to load mobile access settings."},{status});
  }
}

export async function POST(req:Request){
  try{
    await requireAdmin();
    const body=await req.json().catch(()=>null);
    if(!body||typeof body!=="object")return NextResponse.json({ok:false,error:"Invalid settings."},{status:400});
    const bannedCountries=normalizeList(body.bannedCountries,260).map(x=>x.toUpperCase()).filter(x=>/^[A-Z]{2}$/.test(x));
    const blockedDevices=normalizeList(body.blockedDevices,100).map(x=>x.slice(0,100));
    const blockedAppVersions=normalizeList(body.blockedAppVersions,100).map(x=>x.slice(0,40));
    const blockedAndroidSdk=normalizeList(body.blockedAndroidSdk,50).map(x=>Math.floor(Number(x))).filter(x=>Number.isFinite(x)&&x>0&&x<100);
    const minAndroidSdk=Math.floor(Number(body.minAndroidSdk||0));
    const minAppVersionCode=Math.floor(Number(body.minAppVersionCode??15));
    if(!Number.isFinite(minAppVersionCode)||minAppVersionCode<0||minAppVersionCode>999999)return NextResponse.json({ok:false,error:"Choose a valid minimum app build code."},{status:400});
    if(!Number.isFinite(minAndroidSdk)||minAndroidSdk<0||minAndroidSdk>100)return NextResponse.json({ok:false,error:"Choose a valid minimum Android version."},{status:400});
    const whatsapp=String(body.whatsapp||"252907868526").replace(/[^0-9]/g,"").slice(0,20);
    if(whatsapp.length<8)return NextResponse.json({ok:false,error:"Enter a valid WhatsApp number with country code."},{status:400});
    const settings={_id:"mobileAccess",bannedCountries,blockedDevices,blockedAppVersions,blockedAndroidSdk,minAndroidSdk,minAppVersionCode,whatsapp,updatedAt:new Date()};
    await (await collection<any>("settings")).replaceOne({_id:"mobileAccess"},settings,{upsert:true});
    return NextResponse.json({ok:true,settings});
  }catch(error){
    const message=error instanceof Error?error.message:"";
    const status=message==="AUTH_REQUIRED"||message==="ADMIN_REQUIRED"?401:500;
    return NextResponse.json({ok:false,error:status===401?"Unauthorized":"Unable to save mobile access settings."},{status});
  }
}
