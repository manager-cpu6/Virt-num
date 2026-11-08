"use client";
import {useEffect,useMemo,useState} from "react";

const COUNTRY_CODES=["AD","AE","AF","AG","AI","AL","AM","AO","AQ","AR","AS","AT","AU","AW","AX","AZ","BA","BB","BD","BE","BF","BG","BH","BI","BJ","BL","BM","BN","BO","BQ","BR","BS","BT","BV","BW","BY","BZ","CA","CC","CD","CF","CG","CH","CI","CK","CL","CM","CN","CO","CR","CU","CV","CW","CX","CY","CZ","DE","DJ","DK","DM","DO","DZ","EC","EE","EG","EH","ER","ES","ET","FI","FJ","FK","FM","FO","FR","GA","GB","GD","GE","GF","GG","GH","GI","GL","GM","GN","GP","GQ","GR","GS","GT","GU","GW","GY","HK","HM","HN","HR","HT","HU","ID","IE","IL","IM","IN","IO","IQ","IR","IS","IT","JE","JM","JO","JP","KE","KG","KH","KI","KM","KN","KP","KR","KW","KY","KZ","LA","LB","LC","LI","LK","LR","LS","LT","LU","LV","LY","MA","MC","MD","ME","MF","MG","MH","MK","ML","MM","MN","MO","MP","MQ","MR","MS","MT","MU","MV","MW","MX","MY","MZ","NA","NC","NE","NF","NG","NI","NL","NO","NP","NR","NU","NZ","OM","PA","PE","PF","PG","PH","PK","PL","PM","PN","PR","PS","PT","PW","PY","QA","RE","RO","RS","RU","RW","SA","SB","SC","SD","SE","SG","SH","SI","SJ","SK","SL","SM","SN","SO","SR","SS","ST","SV","SX","SY","SZ","TC","TD","TF","TG","TH","TJ","TK","TL","TM","TN","TO","TR","TT","TV","TW","TZ","UA","UG","UM","US","UY","UZ","VA","VC","VE","VG","VI","VN","VU","WF","WS","YE","YT","ZA","ZM","ZW"];
const countryNames=new Intl.DisplayNames(["en"],{type:"region"});
type Settings={bannedCountries:string[];blockedDevices:string[];blockedAppVersions:string[];blockedAndroidSdk:number[];minAndroidSdk:number;whatsapp:string};
const empty:Settings={bannedCountries:[],blockedDevices:[],blockedAppVersions:[],blockedAndroidSdk:[],minAndroidSdk:0,whatsapp:"252907868526"};
const androidVersions=[["No minimum",0],["Android 8.0 Oreo",26],["Android 9 Pie",28],["Android 10",29],["Android 11",30],["Android 12",31],["Android 12L",32],["Android 13",33],["Android 14",34],["Android 15",35],["Android 16",36]] as const;

type AccessSection="all"|"countries"|"devices";
export default function AdminMobileAccess({section="all"}:{section?:AccessSection}){
 const [settings,setSettings]=useState<Settings>(empty);
 const [query,setQuery]=useState("");
 const [device,setDevice]=useState("");
 const [version,setVersion]=useState("");
 const [blockedSdk,setBlockedSdk]=useState(35);
 const [busy,setBusy]=useState(false);
 const [message,setMessage]=useState("");
 const [error,setError]=useState("");
 async function load(){
  try{const r=await fetch("/api/admin/mobile-access",{cache:"no-store"});const d=await r.json();if(d.ok)setSettings({...empty,...d.settings});else setError(d.error||"Unable to load access settings.");}
  catch{setError("Unable to load mobile access settings.");}
 }
 useEffect(()=>{void load()},[]);
 const countries=useMemo(()=>COUNTRY_CODES.map(code=>({code,name:countryNames.of(code)||code})).filter(x=>(x.name+" "+x.code).toLowerCase().includes(query.toLowerCase())).sort((a,b)=>a.name.localeCompare(b.name)),[query]);
 function toggleCountry(code:string){
  setSettings(s=>({...s,bannedCountries:s.bannedCountries.includes(code)?s.bannedCountries.filter(x=>x!==code):[...s.bannedCountries,code]}));
 }
 function addDevice(){const value=device.trim();if(!value||settings.blockedDevices.some(x=>x.toLowerCase()===value.toLowerCase()))return;setSettings(s=>({...s,blockedDevices:[...s.blockedDevices,value]}));setDevice("")}
 function addVersion(){const value=version.trim();if(!value||settings.blockedAppVersions.includes(value))return;setSettings(s=>({...s,blockedAppVersions:[...s.blockedAppVersions,value]}));setVersion("")}
 async function save(){
  setBusy(true);setError("");setMessage("");
  try{const r=await fetch("/api/admin/mobile-access",{method:"POST",headers:{"Content-Type":"application/json"},credentials:"include",body:JSON.stringify(settings)});const d=await r.json();if(!r.ok||!d.ok)throw new Error(d.error||"Unable to save access rules.");setSettings({...empty,...d.settings});setMessage("Mobile access rules saved.");}
  catch(e){setError(e instanceof Error?e.message:"Unable to save access rules.");}
  finally{setBusy(false)}
 }
 return <div className="admin-notifications">
  {section!=="devices"&&<div className="admin-card">
   <h2>App Countries</h2>
   <p className="admin-help">Control which countries, device models, Android versions and app builds can access Numelixa. Saved rules are enforced by the server when the Android app starts.</p>
   <label>Search all countries<input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search country or ISO code…"/></label>
   <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(190px,1fr))",gap:8,maxHeight:300,overflowY:"auto",padding:"8px 2px"}}>
    {countries.map(c=><label key={c.code} style={{display:"flex",alignItems:"center",gap:9,padding:"8px 10px",border:"1px solid rgba(120,160,210,.18)",borderRadius:12,background:settings.bannedCountries.includes(c.code)?"rgba(190,55,80,.14)":"rgba(10,25,48,.55)"}}>
     <input type="checkbox" checked={settings.bannedCountries.includes(c.code)} onChange={()=>toggleCountry(c.code)}/>
     <span style={{flex:1}}>{c.name}</span><small style={{opacity:.6}}>{c.code}</small>
    </label>)}
   </div>
   <p className="admin-help">{settings.bannedCountries.length} countries blocked · {COUNTRY_CODES.length} country/territory codes available</p>
  </div>}
  {section!=="countries"&&<>
  <div className="admin-card">
   <h2>App Devices</h2>
   <p className="admin-help">Enter an exact model name or a model fragment such as SM-A155F or Samsung Galaxy A15.</p>
   <div style={{display:"flex",gap:8,flexWrap:"wrap"}}><input value={device} onChange={e=>setDevice(e.target.value)} placeholder="Device model / model code" style={{flex:"1 1 220px"}}/><button type="button" className="secondary-btn" onClick={addDevice}>Add device</button></div>
   {settings.blockedDevices.map(x=><div className="admin-row" key={x}><span>{x}</span><button type="button" onClick={()=>setSettings(s=>({...s,blockedDevices:s.blockedDevices.filter(v=>v!==x)}))}>Remove</button></div>)}
  </div>
  <div className="admin-card">
   <h2>Android OS and app-version restrictions</h2>
   <label>Minimum supported Android version<select value={settings.minAndroidSdk} onChange={e=>setSettings(s=>({...s,minAndroidSdk:Number(e.target.value)}))}>{androidVersions.map(([label,sdk])=><option key={sdk} value={sdk}>{label}</option>)}</select></label>
   <p className="admin-help">Example: Android 15 requires API level 35 or newer. Leave “No minimum” to allow all supported Android versions.</p>
   <label>Block a specific Android release<select value={blockedSdk} onChange={e=>setBlockedSdk(Number(e.target.value))}>{androidVersions.filter(([,sdk])=>sdk>0).map(([label,sdk])=><option key={sdk} value={sdk}>{label}</option>)}</select></label>
   <button type="button" className="secondary-btn" onClick={()=>setSettings(s=>({...s,blockedAndroidSdk:Array.from(new Set([...s.blockedAndroidSdk,blockedSdk]))}))} disabled={settings.blockedAndroidSdk.includes(blockedSdk)}>Block selected Android version</button>
   {settings.blockedAndroidSdk.map(sdk=><div className="admin-row" key={sdk}><span>{androidVersions.find(([,value])=>value===sdk)?.[0]||("Android API "+sdk)} blocked</span><button type="button" onClick={()=>setSettings(s=>({...s,blockedAndroidSdk:s.blockedAndroidSdk.filter(v=>v!==sdk)}))}>Allow</button></div>)}
   <div style={{display:"flex",gap:8,flexWrap:"wrap"}}><input value={version} onChange={e=>setVersion(e.target.value)} placeholder="Exact app version, e.g. 1.0.10" style={{flex:"1 1 220px"}}/><button type="button" className="secondary-btn" onClick={addVersion}>Block version</button></div>
   {settings.blockedAppVersions.map(x=><div className="admin-row" key={x}><span>App version {x}</span><button type="button" onClick={()=>setSettings(s=>({...s,blockedAppVersions:s.blockedAppVersions.filter(v=>v!==x)}))}>Remove</button></div>)}
   <label style={{marginTop:14}}>WhatsApp support number (include country code)<input value={settings.whatsapp} onChange={e=>setSettings(s=>({...s,whatsapp:e.target.value}))} placeholder="252907868526"/></label>
  </>}
  {error&&<div className="error-box">{error}</div>}{message&&<div className="success-box">{message}</div>}
  <button className="primary-btn" disabled={busy} onClick={save}>{busy?"Saving…":"Save app availability rules"}</button>
 </div>;
}
