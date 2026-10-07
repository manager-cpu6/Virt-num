"use client";
import Link from "next/link";
import {useEffect,useMemo,useState} from "react";
import TopBar from "@/components/TopBar";
type C={id:string;code:string;name:string;short_name?:string;iso?:string;flag?:string;stock?:{count:number;sellCoins:number;providerCost:number;usdPrice:number;rate?:number}|null};
const popular=new Set(["usa","england","canada","germany","france","australia","india","southafrica","nigeria","kenya"]);
const africa=new Set(["algeria","angola","benin","botswana","burkinafaso","burundi","cameroon","capeverde","chad","comoros","djibouti","egypt","ethiopia","gabon","gambia","ghana","guinea","guineabissau","ivorycoast","kenya","lesotho","liberia","madagascar","malawi","mauritania","mauritius","morocco","mozambique","namibia","nigeria","rwanda","senegal","seychelles","sierraleone","somalia","southafrica","swaziland","tanzania","togo","tunisia","uganda","zambia"]);
const europe=new Set(["albania","austria","belgium","bosniaandherzegovina","bulgaria","croatia","cyprus","czech","denmark","england","estonia","finland","france","georgia","germany","greece","hungary","ireland","italy","latvia","lithuania","luxembourg","moldova","montenegro","netherlands","norway","poland","portugal","romania","serbia","slovakia","slovenia","spain","sweden"]);
const asia=new Set(["afghanistan","bahrain","bangladesh","cambodia","china","hongkong","india","indonesia","israel","japan","jordan","kazakhstan","kuwait","kyrgyzstan","laos","malaysia","maldives","mongolia","nepal","oman","pakistan","philippines","saudiarabia","srilanka","taiwan","tajikistan","thailand","turkey","uzbekistan","vietnam"]);
const serviceNames:Record<string,string>={whatsapp:"WhatsApp",telegram:"Telegram",google:"Google",facebook:"Facebook",instagram:"Instagram/Threads",tiktok:"TikTok",twitter:"X / Twitter",snapchat:"Snapchat",viber:"Viber",discord:"Discord",amazon:"Amazon",microsoft:"Microsoft",apple:"Apple",openai:"OpenAI/ChatGPT",signal:"Signal",wechat:"WeChat",yahoo:"Yahoo"};
function serviceName(s:string){return serviceNames[s.toLowerCase()]||s.replace(/[_-]+/g," ").replace(/\b\w/g,c=>c.toUpperCase())}
const NAME_ISO:Record<string,string>={
afghanistan:"AF",albania:"AL",algeria:"DZ",andorra:"AD",angola:"AO",argentina:"AR",armenia:"AM",australia:"AU",austria:"AT",azerbaijan:"AZ",
bahrain:"BH",bangladesh:"BD",belarus:"BY",belgium:"BE",benin:"BJ",bolivia:"BO",bosniaandherzegovina:"BA",botswana:"BW",brazil:"BR",bulgaria:"BG",burkinafaso:"BF",burundi:"BI",
cambodia:"KH",cameroon:"CM",canada:"CA",capeverde:"CV",chad:"TD",chile:"CL",china:"CN",colombia:"CO",comoros:"KM",costarica:"CR",croatia:"HR",cyprus:"CY",czechrepublic:"CZ",czechia:"CZ",
denmark:"DK",djibouti:"DJ",dominica:"DM",dominicanrepublic:"DO",ecuador:"EC",egypt:"EG",elsalvador:"SV",equatorialguinea:"GQ",eritrea:"ER",estonia:"EE",eswatini:"SZ",ethiopia:"ET",
fiji:"FJ",finland:"FI",france:"FR",gabon:"GA",gambia:"GM",georgia:"GE",germany:"DE",ghana:"GH",greece:"GR",grenada:"GD",guatemala:"GT",guinea:"GN",guineabissau:"GW",guyana:"GY",
haiti:"HT",honduras:"HN",hongkong:"HK",hungary:"HU",iceland:"IS",india:"IN",indonesia:"ID",iran:"IR",iraq:"IQ",ireland:"IE",israel:"IL",italy:"IT",ivorycoast:"CI",
jamaica:"JM",japan:"JP",jordan:"JO",kazakhstan:"KZ",kenya:"KE",kuwait:"KW",kyrgyzstan:"KG",laos:"LA",latvia:"LV",lebanon:"LB",lesotho:"LS",liberia:"LR",libya:"LY",liechtenstein:"LI",lithuania:"LT",luxembourg:"LU",
madagascar:"MG",malawi:"MW",malaysia:"MY",maldives:"MV",mali:"ML",malta:"MT",mauritania:"MR",mauritius:"MU",mexico:"MX",moldova:"MD",monaco:"MC",mongolia:"MN",montenegro:"ME",morocco:"MA",mozambique:"MZ",
namibia:"NA",nepal:"NP",netherlands:"NL",newzealand:"NZ",nicaragua:"NI",niger:"NE",nigeria:"NG",northmacedonia:"MK",norway:"NO",
oman:"OM",pakistan:"PK",panama:"PA",papuanewguinea:"PG",paraguay:"PY",peru:"PE",philippines:"PH",poland:"PL",portugal:"PT",
qatar:"QA",romania:"RO",russia:"RU",rwanda:"RW",saudiarabia:"SA",senegal:"SN",serbia:"RS",seychelles:"SC",sierraleone:"SL",singapore:"SG",slovakia:"SK",slovenia:"SI",somalia:"SO",southafrica:"ZA",southkorea:"KR",southsudan:"SS",spain:"ES",srilanka:"LK",sudan:"SD",suriname:"SR",sweden:"SE",switzerland:"CH",syria:"SY",
taiwan:"TW",tajikistan:"TJ",tanzania:"TZ",thailand:"TH",togo:"TG",trinidadandtobago:"TT",tunisia:"TN",turkey:"TR",turkmenistan:"TM",uganda:"UG",ukraine:"UA",unitedarabemirates:"AE",unitedkingdom:"GB",unitedstates:"US",usa:"US",uruguay:"UY",uzbekistan:"UZ",
venezuela:"VE",vietnam:"VN",yemen:"YE",zambia:"ZM",zimbabwe:"ZW",england:"GB"
};
function countryKey(v:string){return String(v||"").toLowerCase().replace(/[^a-z]/g,"")}
function flag(iso:string,name=""){const direct=String(iso||"").toUpperCase();const code=/^[A-Z]{2}$/.test(direct)?direct:NAME_ISO[countryKey(name)]||"";return code?String.fromCodePoint(...[...code].map(c=>127397+c.charCodeAt(0))):"🌐"}
function AppLogo({service,name}:{service:string;name:string}){
 const[hasLogo,setHasLogo]=useState(true);
 return <span className={"service-icon service-icon-"+service}>
   {hasLogo
     ? <img src={"https://cdn.simpleicons.org/"+service} alt="" onLoad={()=>setHasLogo(true)} onError={()=>setHasLogo(false)}/>
     : <span className="service-letter">{name.slice(0,1).toUpperCase()}</span>}
 </span>
}
export default function CountriesPage(){
 const[countries,setCountries]=useState<C[]>([]),[service,setService]=useState(""),[loading,setLoading]=useState(true),[search,setSearch]=useState(""),[filter,setFilter]=useState("All"),[error,setError]=useState("");
 useEffect(()=>{const p=new URLSearchParams(window.location.search),sv=p.get("service")||"";setService(sv);if(!sv){setError("Choose a service first.");setLoading(false);return}fetch("/api/catalog/countries?service="+encodeURIComponent(sv),{cache:"no-store"}).then(async r=>{const d=await r.json();if(!r.ok||!d.ok)throw new Error(d.error||"Live countries unavailable");setCountries(Array.isArray(d.countries)?d.countries:[])}).catch(e=>setError(e instanceof Error?e.message:"Unable to load live countries")).finally(()=>setLoading(false))},[]);
 const visible=useMemo(()=>{const q=search.trim().toLowerCase();return countries.filter(c=>{const n=c.name.toLowerCase(),id=c.id.toLowerCase();if(q&&!n.includes(q)&&!id.includes(q))return false;const key=countryKey(n);
if(filter==="Popular"&&!popular.has(id)&&!popular.has(key))return false;
if(filter==="Africa"&&!africa.has(id)&&!africa.has(key))return false;
if(filter==="Europe"&&!europe.has(id)&&!europe.has(key))return false;
if(filter==="Asia"&&!asia.has(id)&&!asia.has(key))return false;return true}).sort((a,b)=>Number((b.stock?.count||0)>0)-Number((a.stock?.count||0)>0)||a.name.localeCompare(b.name))},[countries,search,filter]);
 const name=serviceName(service);
 return <div className="countries-page"><TopBar title={name} back/><div className="country-banner"><AppLogo service={service} name={name}/><div><b>Receive SMS for {name}</b><small>Select a country to see live stock and price.</small></div></div><div className="form-card country-search"><span className="search-icon">⌕</span><input value={search} onChange={e=>setSearch(e.target.value)} placeholder="Search country…" autoComplete="off"/></div><div id="country-filters" className="country-filters">{["All","Popular","Africa","Europe","Asia"].map(x=><button key={x} onClick={()=>setFilter(x)} className={filter===x?"active":""}>{x}</button>)}</div><div className="list-card country-list">{loading&&<div className="country-loading">Loading live countries…</div>}{!loading&&error&&<div className="helper-card"><b>Live catalog unavailable</b><span>Check the active SMS provider configuration in Vercel Production.</span></div>}{!loading&&!error&&!visible.length&&<div className="country-loading">No supported countries for this service.</div>}{!loading&&!error&&visible.map((c,i)=>{const p=c.stock,ready=!!p&&p.count>0&&p.sellCoins>0;const href="/get-code/new?service="+encodeURIComponent(service)+"&country="+encodeURIComponent(c.id)+"&countryName="+encodeURIComponent(c.name);const rate=p?.rate||0;return <Link className={"country-row "+(!ready?"country-unavailable":"")} key={c.id||i} href={ready?href:"#"} onClick={e=>{if(!ready)e.preventDefault()}}><span className="flag">{c.flag||flag(c.iso||"",c.name)}</span><span className="country-name"><b>{c.name}</b><small>{ready?"Available: "+p!.count.toLocaleString():"Currently unavailable"}</small></span><span className="country-price">{ready?<><b>${p!.usdPrice.toFixed(2)}</b><small>{p!.sellCoins.toLocaleString()} coins{rate?" • "+rate.toFixed(0)+"%":""}</small></>:"—"}</span><span className="chevron">›</span></Link>})}</div><div className="price-note"><span>i</span><p>Countries, services, stock and prices are live. Numelixa applies its configured markup and coin rate.</p></div></div>;
}