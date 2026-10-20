import {NextResponse} from "next/server";
import {collection} from "@/lib/mongo";

export const runtime="nodejs";
export const dynamic="force-dynamic";
export const maxDuration=300;

const CURRENT_VERSION="1.0.7+8";
const CURRENT_RELEASE_APK="https://github.com/manager-cpu6/Numelixa-app/releases/download/android-latest/Numelixa.apk";
const ALLOWED_HOSTS=new Set([
  "github.com","www.github.com",
  "objects.githubusercontent.com","release-assets.githubusercontent.com",
  "raw.githubusercontent.com","githubusercontent.com"
]);

function compareVersions(left:string,right:string){
  const normalize=(value:string)=>value.split("+")[0].split("-")[0].split(".").map(part=>Number.parseInt(part,10)||0);
  const a=normalize(left),b=normalize(right);
  for(let i=0;i<Math.max(a.length,b.length);i++){
    const diff=(a[i]||0)-(b[i]||0);
    if(diff!==0)return diff;
  }
  return 0;
}

function safeSource(value:string){
  try{
    const url=new URL(value);
    return url.protocol==="https:"&&ALLOWED_HOSTS.has(url.hostname.toLowerCase())?url:null;
  }catch{return null;}
}

async function getSource(){
  const latest=await (await collection<any>("appUpdates")).findOne(
    {published:true},
    {sort:{publishedAt:-1},projection:{version:1,apkUrl:1,sourceApkUrl:1}}
  );
  const version=String(latest?.version||"").trim();
  // Ignore the old Virt-num APK that was previously served from this domain.
  // A newer, explicitly published app-update can still override this release.
  if(version&&compareVersions(version,CURRENT_VERSION)>0){
    const custom=safeSource(String(latest?.sourceApkUrl||latest?.apkUrl||"").trim());
    if(custom)return custom;
  }
  return new URL(CURRENT_RELEASE_APK);
}

function isAppLanding(req:Request){return new URL(req.url).hostname.toLowerCase()==="app.numelixa.com";}
function landingPage(){return `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="theme-color" content="#030817"><title>Numelixa Android App</title><style>*{box-sizing:border-box}body{margin:0;background:radial-gradient(ellipse at 50% 0%,#07324c 0,transparent 45%),linear-gradient(180deg,#030817,#071329 60%,#030817);color:#f5f8ff;font-family:Inter,system-ui,-apple-system,sans-serif}main{max-width:1000px;margin:auto;padding:28px 18px 70px}.brand{color:#00d9ff;font-weight:900;text-decoration:none}.hero{display:grid;grid-template-columns:repeat(auto-fit,minmax(260px,1fr));gap:32px;align-items:center;padding:48px 0}.eyebrow{color:#00d9ff;font-size:12px;font-weight:800;letter-spacing:.18em}h1{font-size:clamp(40px,7vw,68px);letter-spacing:-2px;line-height:1.02;margin:15px 0}h1 em{font-style:normal;color:#00d9ff}p{color:#a7b7d0;line-height:1.8}.download{display:inline-flex;padding:15px 22px;border-radius:15px;background:linear-gradient(100deg,#00d9ff,#168cff);color:#031022;font-weight:900;text-decoration:none;margin-top:12px}.previews{display:grid;grid-template-columns:repeat(auto-fit,minmax(240px,1fr));gap:22px;border-top:1px solid #1b3553;padding-top:28px}.phone{max-width:290px;margin:auto;border:1px solid #244568;border-radius:28px;background:linear-gradient(160deg,#0d2345,#071329);padding:18px;box-shadow:0 24px 70px #0006}.speaker{width:64px;height:5px;border-radius:9px;background:#314a6b;margin:0 auto 18px}.appname{font-weight:900;margin-bottom:20px}.balance,.item{border:1px solid #203b5d;border-radius:14px;background:#07172d;padding:13px;margin:9px 0}.balance{background:linear-gradient(120deg,#0b4770,#172d61)}.amount{font-size:28px;font-weight:900;margin-top:8px}.cyan{color:#00d9ff}.nav{display:flex;justify-content:space-around;border-top:1px solid #203b5d;padding-top:15px;margin-top:14px;color:#a7b7d0;font-size:10px}.label{text-align:center;font-weight:800}.sub{text-align:center;font-size:13px;margin-top:5px}small{color:#7185a5;line-height:1.7}@media(max-width:480px){.hero{padding-top:34px}h1{font-size:44px}}</style></head><body><main><a class="brand" href="https://numelixa.com">← NUMELIXA</a><section class="hero"><div><div class="eyebrow">OFFICIAL ANDROID APP</div><h1>Numelixa.<br><em>Made for mobile.</em></h1><p>Manage virtual numbers, SMS activations, your coin wallet and account from one focused Android app.</p><p><a class="download" href="/api/mobile/apk">Download Numelixa ↓</a></p><small>Android APK · approximately 55 MB · Package: com.numelixa.app<br>If Android asks, allow your browser to install apps from this source.</small></div><div class="phone"><div class="speaker"></div><div class="appname">🌐 Numelixa <span class="cyan" style="float:right;font-size:11px">● LIVE</span></div><b style="font-size:22px">Your account.</b><p style="font-size:12px;margin:5px 0 14px">Numbers, without the noise.</p><div class="balance"><small>WALLET BALANCE</small><div class="amount">250 <span class="cyan" style="font-size:12px">coins</span></div></div><div style="display:grid;grid-template-columns:1fr 1fr;gap:8px"><div class="item">🌐<br><b>Buy numbers</b></div><div class="item">▣<br><b>My orders</b></div><div class="item">◈<br><b>Wallet</b></div><div class="item">♙<br><b>Account</b></div></div><div class="nav"><span>⌂ Home</span><span>◎ Buy</span><span>▣ Orders</span><span>◈ Wallet</span></div></div></section><section><h2>See the app experience</h2><p>Preview the dashboard and SMS activation screens.</p><div class="previews"><div><div class="phone"><div class="speaker"></div><div class="appname">🌐 Numelixa</div><b style="font-size:20px">Your mobile dashboard</b><div class="balance"><small>WALLET BALANCE</small><div class="amount">250 <span class="cyan" style="font-size:12px">coins</span></div></div><div class="item">🌐 &nbsp; Buy numbers</div><div class="item">▣ &nbsp; My orders</div><div class="item">◈ &nbsp; Wallet</div><div class="item">♙ &nbsp; Account</div><div class="nav">⌂ Home　 ◎ Buy　 ◈ Wallet</div></div><p class="label">Mobile dashboard</p><p class="sub">Wallet and core features at a glance.</p></div><div><div class="phone"><div class="speaker"></div><div class="appname">🌐 Numelixa</div><b style="font-size:20px">Your activations</b><p style="font-size:12px;margin:5px 0 14px">Manage your verification numbers.</p><div class="item"><b>WhatsApp</b><span class="cyan" style="float:right;font-size:10px">Waiting for SMS</span><p class="cyan" style="margin:12px 0 0;font-size:12px">+1 202 ••• 0188</p></div><div class="item"><b>Telegram</b><span class="cyan" style="float:right;font-size:10px">Code received</span><p class="cyan" style="margin:12px 0 0;font-size:12px">+44 7400 ••••</p></div><div class="nav">⌂ Home　 ◎ Buy　 ▣ Orders　 ◈ Wallet</div></div><p class="label">SMS activations</p><p class="sub">View active numbers and verification status.</p></div></div></section><p style="text-align:center;margin-top:40px;font-size:12px">Numelixa · Global Virtual Numbers</p></main></body></html>`}
export async function HEAD(req:Request){
  if(isAppLanding(req))return new NextResponse(null,{status:200,headers:{"Content-Type":"text/html; charset=utf-8","Cache-Control":"no-store"}});
  try{
    const source=await getSource();
    const upstream=await fetch(source,{method:"HEAD",redirect:"follow",cache:"no-store"});
    const headers=new Headers();
    for(const name of ["content-length","content-type","accept-ranges","etag","last-modified"]){
      const value=upstream.headers.get(name);
      if(value)headers.set(name,value);
    }
    headers.set("Cache-Control","no-store");
    headers.set("Content-Disposition",'attachment; filename="Numelixa.apk"');
    return new NextResponse(null,{status:upstream.status,headers});
  }catch(error){
    console.error("[APK HEAD]",error);
    return new NextResponse("APK is temporarily unavailable.",{status:503});
  }
}

export async function GET(req:Request){
  if(isAppLanding(req))return new NextResponse(landingPage(),{status:200,headers:{"Content-Type":"text/html; charset=utf-8","Cache-Control":"no-store","X-Content-Type-Options":"nosniff"}});
  try{
    const source=await getSource();
    const range=req.headers.get("range");
    const headers=new Headers();
    if(range)headers.set("Range",range);
    const upstream=await fetch(source,{method:"GET",headers,redirect:"follow",cache:"no-store"});
    const responseHeaders=new Headers();
    for(const name of ["content-length","content-type","content-range","accept-ranges","etag","last-modified"]){
      const value=upstream.headers.get(name);
      if(value)responseHeaders.set(name,value);
    }
    responseHeaders.set("Content-Disposition",'attachment; filename="Numelixa.apk"');
    responseHeaders.set("Cache-Control","no-store, no-cache, must-revalidate");
    responseHeaders.set("X-Content-Type-Options","nosniff");
    return new Response(upstream.body,{status:upstream.status,headers:responseHeaders});
  }catch(error){
    console.error("[APK GET]",error);
    return new NextResponse("APK is temporarily unavailable.",{status:503});
  }
}
