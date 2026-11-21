"use client";
import {useState} from "react";

const aliases:Record<string,string>={
 wa:"whatsapp",whatsapp:"whatsapp",whatsappbusiness:"whatsapp",fb:"facebook",facebook:"facebook",facebooklite:"facebook",
 ig:"instagram",instagram:"instagram",instagramlite:"instagram",threads:"threads",tg:"telegram",telegram:"telegram",telegramx:"telegram",
 tt:"tiktok",tiktok:"tiktok",tiktoklite:"tiktok",go:"google",google:"google",googlevoice:"googlevoice",gmail:"gmail",youtube:"youtube",youtubemusic:"youtubemusic",
 am:"amazon",az:"amazon",amazon:"amazon",amazonprime:"amazon",amazonshop:"amazon",ap:"apple",apple:"apple",
 op:"openai",oi:"openai",openai:"openai",cg:"chatgpt",chatgpt:"chatgpt",claudeai:"claude",claude:"claude",
 tw:"x",twitter:"x",x:"x",ms:"microsoft",mi:"microsoft",microsoft:"microsoft",microsoftteams:"microsoftteams",
 sn:"snapchat",snapchat:"snapchat",ds:"discord",discord:"discord",li:"linkedin",linkedin:"linkedin",
 pp:"paypal",py:"paypal",paypal:"paypal",rd:"reddit",reddit:"reddit",sp:"spotify",spotify:"spotify",nf:"netflix",netflix:"netflix",
 vb:"viber",viber:"viber",sg:"signal",signal:"signal",vk:"vk",yandex:"yandex",binance:"binance",bybit:"bybit",okx:"okx",
 ebay:"ebay",uber:"uber",airbnb:"airbnb",pinterest:"pinterest",twitch:"twitch",steam:"steam",dropbox:"dropbox",
 slack:"slack",zoom:"zoom",notion:"notion",canva:"canva",figma:"figma",capcut:"capcut",protonmail:"protonmail",
 "1xbet":"1xbet","1bet":"1xbet",vercel:"vercel",xbox:"xbox",playstation:"playstation",epicgames:"epicgames",
 roblox:"roblox",coinbase:"coinbase",kucoin:"kucoin",bitget:"bitget",grab:"grab",bolt:"bolt",olx:"olx",
 shopee:"shopee",rakuten:"rakuten",tinder:"tinder",bumble:"bumble",wechat:"wechat",line:"line",yahoo:"yahoo",
 zupee:"zupee",huya:"huya",moneza:"moneza",miratorg:"miratorg",hulu:"hulu",disneyplus:"disneyplus",paramountplus:"paramountplus",booking:"bookingdotcom",bookingcom:"bookingdotcom",
 expedia:"expedia",agoda:"agoda",googlepay:"googlepay",gpay:"googlepay",googleplay:"googleplay",microsoft365:"microsoft365",
 teams:"microsoftteams",kakaotalk:"kakaotalk",imo:"imo",skype:"skype",airtel:"airtel",
};

const brandNames:Record<string,string>={
 whatsapp:"WhatsApp",telegram:"Telegram",tiktok:"TikTok",instagram:"Instagram",facebook:"Facebook",google:"Google",
 discord:"Discord",x:"X",amazon:"Amazon",microsoft:"Microsoft",paypal:"PayPal",snapchat:"Snapchat",
 googlepay:"Google Pay",googleplay:"Google Play",apple:"Apple",youtube:"YouTube",openai:"OpenAI",threads:"Threads",
 linkedin:"LinkedIn",reddit:"Reddit",spotify:"Spotify",netflix:"Netflix",viber:"Viber",signal:"Signal",
};

const normalize=(v:string)=>v.toLowerCase().replace(/[^a-z0-9]/g,"");
export function canonicalServiceBrand(id:string,name:string){
 const a=normalize(id),b=normalize(name);
 const keys=Object.keys(aliases).sort((x,y)=>y.length-x.length);
 for(const key of keys){if(a===key||b===key||(key.length>=3&&(a.startsWith(key)||b.startsWith(key))))return aliases[key]}
 return "";
}
export function fullServiceName(value:string){
 const raw=String(value||"").trim();if(!raw)return "SMS service";
 const key=normalize(raw);if(key==="chatgpt"||key==="cg")return "ChatGPT";
 const brand=aliases[key]||key;
 if(brandNames[brand])return brandNames[brand];
 return raw.replace(/[_-]+/g," ").replace(/\b\w/g,c=>c.toUpperCase());
}
function serviceSlugs(id:string,name:string){
 const brand=canonicalServiceBrand(id,name);
 const raw=normalize(name)||normalize(id);
 const primary=brand||raw;
 const candidates=[primary];
 // Some catalog aliases resolve to a platform family while the provider has
 // a separately named first-party mark. Try the canonical icon first, then
 // the exact catalog label before falling back to initials.
 if(raw&&raw!==primary)candidates.push(raw);
 if(brand==="openai")candidates.push("chatgpt");
 if(brand==="amazon")candidates.push("amazon");
 if(brand==="microsoft")candidates.push("microsoft");
 return [...new Set(candidates)].filter(Boolean);
}
export default function ServiceLogo({id,name,className=""}:{id:string;name:string;className?:string}){
 const [failed,setFailed]=useState<string[]>([]);
 const [faviconFailed,setFaviconFailed]=useState(false);
 const slugs=serviceSlugs(id,name);
 const current=slugs.find(slug=>!failed.includes(slug))||"";
 const initials=name.trim().split(/\s+/).filter(Boolean).slice(0,2).map(part=>part[0]).join("").toUpperCase()||"?";
 const domainByBrand:Record<string,string>={zupee:"zupee.com",huya:"huya.com",moneza:"moneza.com",miratorg:"miratorg.ru",chatgpt:"chatgpt.com",amazon:"amazon.com",microsoft:"microsoft.com",openai:"openai.com",paypal:"paypal.com",apple:"apple.com",google:"google.com",youtube:"youtube.com",discord:"discord.com",telegram:"telegram.org",whatsapp:"whatsapp.com",tiktok:"tiktok.com",instagram:"instagram.com",facebook:"facebook.com",snapchat:"snapchat.com",spotify:"spotify.com",netflix:"netflix.com",linkedin:"linkedin.com",reddit:"reddit.com",x:"x.com",threads:"threads.net"};
 const domain=domainByBrand[slugs[0]]||((normalize(name)||normalize(id)||"service")+".com");
 return <span className={className||"service-icon"} role="img" aria-label={name+" brand mark"} title={fullServiceName(name)} style={{display:"inline-grid",placeItems:"center",flexShrink:0,overflow:"visible",position:"relative",background:"transparent",border:0,boxShadow:"none"}}>
  {current?<img key={current} src={"https://cdn.simpleicons.org/"+encodeURIComponent(current)} alt="" width="56" height="56" loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={()=>setFailed(old=>[...old,current])} style={{width:"100%",height:"100%",objectFit:"contain",padding:0,boxSizing:"border-box",background:"transparent"}}/>:
   !faviconFailed?<img src={"https://www.google.com/s2/favicons?domain="+encodeURIComponent(domain)+"&sz=128"} alt="" width="56" height="56" loading="lazy" onError={()=>setFaviconFailed(true)} style={{width:"78%",height:"78%",objectFit:"contain"}}/>:
   <span aria-hidden="true" style={{fontSize:16,fontWeight:850,letterSpacing:"-.04em",color:"rgba(190,215,245,.78)"}}>{initials}</span>}
 </span>
}
