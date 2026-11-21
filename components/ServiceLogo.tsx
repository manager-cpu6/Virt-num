"use client";
import {useState} from "react";

const aliases:Record<string,string>={
 wa:"whatsapp",whatsapp:"whatsapp",whatsappbusiness:"whatsapp",
 fb:"facebook",facebook:"facebook",facebooklite:"facebook",
 ig:"instagram",instagram:"instagram",instagramlite:"instagram",threads:"threads",
 tg:"telegram",telegram:"telegram",telegramx:"telegram",
 tt:"tiktok",tiktok:"tiktok",tiktoklite:"tiktok",douyin:"douyin",douying:"douyin",
 go:"google",google:"google",googlevoice:"googlevoice",gmail:"gmail",youtube:"youtube",youtubemusic:"youtubemusic",
 am:"amazon",az:"amazon",amazon:"amazon",amazonprime:"amazon",amazonshop:"amazon",
 alibaba:"alibabadotcom",alibabacom:"alibabadotcom",alibabadotcom:"alibabadotcom",alibabacloud:"alibabacloud",
 ap:"apple",apple:"apple",op:"openai",oi:"openai",openai:"openai",cg:"chatgpt",chatgpt:"chatgpt",claudeai:"claude",claude:"claude",
 tw:"x",twitter:"x",tewitter:"x",xtwitter:"x",xtewitter:"x",x:"x",ms:"microsoft",mi:"microsoft",microsoft:"microsoft",microsoftteams:"microsoftteams",
 sn:"snapchat",snapchat:"snapchat",ds:"discord",discord:"discord",li:"linkedin",linkedin:"linkedin",
 pp:"paypal",paypal:"paypal",rd:"reddit",reddit:"reddit",sp:"spotify",spotify:"spotify",nf:"netflix",netflix:"netflix",
 vb:"viber",viber:"viber",sg:"signal",signal:"signal",vk:"vk",yandex:"yandex",binance:"binance",bybit:"bybit",okx:"okx",
 ebay:"ebay",uber:"uber",airbnb:"airbnb",pinterest:"pinterest",twitch:"twitch",steam:"steam",dropbox:"dropbox",
 slack:"slack",zoom:"zoom",notion:"notion",canva:"canva",figma:"figma",capcut:"capcut",protonmail:"protonmail",
 "1xbet":"1xbet","1bet":"1xbet",vercel:"vercel",xbox:"xbox",playstation:"playstation",epicgames:"epicgames",
 roblox:"roblox",coinbase:"coinbase",kucoin:"kucoin",bitget:"bitget",grab:"grab",bolt:"bolt",olx:"olx",
 shopee:"shopee",rakuten:"rakuten",tinder:"tinder",bumble:"bumble",wechat:"wechat",line:"line",yahoo:"yahoo",
 zupee:"zupee",huya:"huya",moneza:"moneza",miratorg:"miratorg",hulu:"hulu",disneyplus:"disneyplus",paramountplus:"paramountplus",
 booking:"bookingdotcom",bookingcom:"bookingdotcom",expedia:"expedia",agoda:"agoda",googlepay:"googlepay",gpay:"googlepay",
 googleplay:"googleplay",microsoft365:"microsoft365",teams:"microsoftteams",kakaotalk:"kakaotalk",imo:"imo",skype:"skype",
 novaposhta:"novaposhta",novaposta:"novaposhta",novapoahta:"novaposhta"
};
const brandNames:Record<string,string>={
 whatsapp:"WhatsApp",telegram:"Telegram",tiktok:"TikTok",douyin:"Douyin",instagram:"Instagram",facebook:"Facebook",google:"Google",
 discord:"Discord",x:"X",amazon:"Amazon",alibabadotcom:"Alibaba",alibabacloud:"Alibaba Cloud",microsoft:"Microsoft",paypal:"PayPal",
 moneza:"Moneza",snapchat:"Snapchat",googlepay:"Google Pay",googleplay:"Google Play",apple:"Apple",youtube:"YouTube",openai:"OpenAI",
 threads:"Threads",linkedin:"LinkedIn",reddit:"Reddit",spotify:"Spotify",netflix:"Netflix",viber:"Viber",signal:"Signal",imo:"imo",
 novaposhta:"Nova Poshta"
};
const simpleIconSlugs=new Set(Object.values(aliases).filter(v=>!["imo","moneza","miratorg","douyin","novaposhta"].includes(v)));
const domainByBrand:Record<string,string>={
 zupee:"zupee.com",huya:"huya.com",moneza:"moneza.com",miratorg:"miratorg.ru",chatgpt:"chatgpt.com",
 amazon:"amazon.com",alibabadotcom:"alibaba.com",alibabacloud:"alibabacloud.com",microsoft:"microsoft.com",
 openai:"openai.com",paypal:"paypal.com",apple:"apple.com",google:"google.com",youtube:"youtube.com",
 discord:"discord.com",telegram:"telegram.org",whatsapp:"whatsapp.com",tiktok:"tiktok.com",douyin:"douyin.com",
 instagram:"instagram.com",facebook:"facebook.com",snapchat:"snapchat.com",spotify:"spotify.com",netflix:"netflix.com",
 linkedin:"linkedin.com",reddit:"reddit.com",x:"x.com",threads:"threads.net",imo:"imo.im",novaposhta:"novaposhta.ua"
};
const normalize=(v:string)=>v.toLowerCase().normalize("NFKD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9]/g,"");
export function canonicalServiceBrand(id:string,name:string){
 const a=normalize(id),b=normalize(name);
 if(aliases[b])return aliases[b];
 if(!b&&aliases[a])return aliases[a];
 // Match a brand followed only by common provider suffixes, never arbitrary prefixes.
 const keys=Object.keys(aliases).filter(k=>k.length>=3).sort((x,y)=>y.length-x.length);
 for(const value of [a,b]){
  for(const key of keys)if(value.startsWith(key)&&/^(?:sms|otp|verification|activation|number|service|app|lite|business)$/.test(value.slice(key.length)))return aliases[key];
 }
 // Combined labels such as "TikTok / Douyin" intentionally prefer the named TikTok product.
 if(b.includes("twitter"))return "x";
 if(b.includes("tiktok"))return "tiktok";
 if(b.includes("douyin")||b.includes("douying"))return "douyin";
 return "";
}
export function hasKnownServiceBrand(id:string,name:string){
 const brand=canonicalServiceBrand(id,name);
 return !!brand&&(simpleIconSlugs.has(brand)||!!domainByBrand[brand]);
}
export function fullServiceName(value:string){
 const raw=String(value||"").trim();if(!raw)return "Service";
 const brand=canonicalServiceBrand(raw,raw);
 return brandNames[brand]||raw.replace(/[_-]+/g," ").replace(/\b\w/g,c=>c.toUpperCase());
}
export default function ServiceLogo({id,name,className=""}:{id:string;name:string;className?:string}){
 const [simpleFailed,setSimpleFailed]=useState(false);
 const [faviconFailed,setFaviconFailed]=useState(false);
 const brand=canonicalServiceBrand(id,name);
 if(!brand)return null;
 const slug=brand==="chatgpt"?"chatgpt":brand;
 const domain=domainByBrand[brand];
 const useSimple=simpleIconSlugs.has(slug);
 if(!useSimple&&!domain)return null;
 return <span className={className||"service-icon"} role="img" aria-label={fullServiceName(name)+" logo"} title={fullServiceName(name)} style={{display:"inline-grid",placeItems:"center",flexShrink:0,overflow:"hidden",position:"relative",background:"transparent",border:0,boxShadow:"none"}}>
  {useSimple&&!simpleFailed?<img src={"https://cdn.simpleicons.org/"+encodeURIComponent(slug)} alt="" width="56" height="56" loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={()=>setSimpleFailed(true)} style={{width:"100%",height:"100%",objectFit:"contain",padding:0,boxSizing:"border-box",background:"transparent"}}/>:
   domain&&!faviconFailed?<img src={"https://www.google.com/s2/favicons?domain="+encodeURIComponent(domain)+"&sz=128"} alt="" width="56" height="56" loading="lazy" referrerPolicy="no-referrer" onError={()=>setFaviconFailed(true)} style={{width:"78%",height:"78%",objectFit:"contain"}}/>:null}
 </span>;
}
