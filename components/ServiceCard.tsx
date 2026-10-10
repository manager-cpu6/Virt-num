import Link from "next/link";
import type {Service} from "@/lib/data";

const LOGOS:Record<string,string>={
 whatsapp:"whatsapp",facebook:"facebook",telegram:"telegram",google:"google",
 instagram:"instagram",tiktok:"tiktok",twitter:"x",x:"x",snapchat:"snapchat",
 viber:"viber",discord:"discord",amazon:"amazon",microsoft:"microsoft",
 apple:"apple",signal:"signal",wechat:"wechat",yahoo:"yahoo",openai:"openai",
 linkedin:"linkedin",paypal:"paypal",reddit:"reddit",uber:"uber",tinder:"tinder",
 airbnb:"airbnb",spotify:"spotify",netflix:"netflix",steam:"steam",binance:"binance"
};
const LABELS:Record<string,string>={whatsapp:"WhatsApp",facebook:"Facebook",telegram:"Telegram",google:"Google",instagram:"Instagram",tiktok:"TikTok",twitter:"X",x:"X",snapchat:"Snapchat",viber:"Viber",discord:"Discord",amazon:"Amazon",microsoft:"Microsoft",apple:"Apple",signal:"Signal",wechat:"WeChat",yahoo:"Yahoo",openai:"ChatGPT",linkedin:"LinkedIn",paypal:"PayPal",reddit:"Reddit",uber:"Uber",tinder:"Tinder",airbnb:"Airbnb",spotify:"Spotify",netflix:"Netflix",steam:"Steam",binance:"Binance"};
export default function ServiceCard({service}:{service:Service}){
 const key=String(service.name||"").toLowerCase().replace(/[^a-z0-9]/g,"");
 const slug=LOGOS[key];
 const label=LABELS[key]||service.name;
 return <Link className={"service-card"+(slug?" service-card-branded service-"+key:"")} href={`/countries?service=${encodeURIComponent(service.name)}`}>
  <span className="service-icon" aria-hidden="true">
   {slug?<><img src={`https://cdn.simpleicons.org/${slug}`} alt="" loading="lazy" onError={e=>{e.currentTarget.style.display="none";const fallback=e.currentTarget.nextElementSibling as HTMLElement|null;if(fallback)fallback.style.display="grid"}}/><span className="service-fallback" style={{display:"none"}}>{label.slice(0,1).toUpperCase()}</span></>:<span className="service-fallback">{service.icon||label.slice(0,1).toUpperCase()}</span>}
  </span>
  <div className="service-card-copy"><b>{label}</b><small>{Number(service.available||0).toLocaleString()} available</small></div>
  <span className="chevron" aria-hidden="true">›</span>
 </Link>
}
