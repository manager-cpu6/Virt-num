"use client";
import {useState} from "react";

const aliases:Record<string,string>={
 wa:"whatsapp",whatsapp:"whatsapp",whatsappbusiness:"whatsapp",fb:"facebook",facebook:"facebook",facebooklite:"facebook",
 ig:"instagram",instagram:"instagram",instagramlite:"instagram",threads:"threads",tg:"telegram",telegram:"telegram",telegramx:"telegram",
 tt:"tiktok",tiktok:"tiktok",tiktoklite:"tiktok",go:"google",google:"google",googlevoice:"googlevoice",gmail:"gmail",youtube:"youtube",youtubemusic:"youtubemusic",
 am:"amazon",amazon:"amazon",amazonprime:"amazon",amazonshop:"amazon",op:"openai",openai:"openai",chatgpt:"openai",claudeai:"claude",
 tw:"x",twitter:"x",x:"x",ms:"microsoft",microsoft:"microsoft",microsoftteams:"microsoftteams",ap:"apple",apple:"apple",
 oi:"openai",sn:"snapchat",snapchat:"snapchat",ds:"discord",discord:"discord",li:"linkedin",linkedin:"linkedin",
 pp:"paypal",paypal:"paypal",rd:"reddit",reddit:"reddit",sp:"spotify",spotify:"spotify",nf:"netflix",netflix:"netflix",
 vb:"viber",viber:"viber",sg:"signal",signal:"signal",vk:"vk",yandex:"yandex",binance:"binance",bybit:"bybit",okx:"okx",
 ebay:"ebay",uber:"uber",airbnb:"airbnb",pinterest:"pinterest",twitch:"twitch",steam:"steam",dropbox:"dropbox",
 slack:"slack",zoom:"zoom",notion:"notion",canva:"canva",figma:"figma",capcut:"capcut",protonmail:"protonmail",
 "1xbet":"1xbet","1bet":"1xbet",vercel:"vercel",xbox:"xbox",playstation:"playstation",epicgames:"epicgames",
 roblox:"roblox",coinbase:"coinbase",kucoin:"kucoin",bitget:"bitget",grab:"grab",bolt:"bolt",olx:"olx",
 shopee:"shopee",rakuten:"rakuten",tinder:"tinder",bumble:"bumble",wechat:"wechat",line:"line",yahoo:"yahoo",
 hulu:"hulu",disneyplus:"disneyplus",paramountplus:"paramountplus",booking:"bookingdotcom",bookingcom:"bookingdotcom",
 expedia:"expedia",agoda:"agoda",googlepay:"googlepay",gpay:"googlepay",googleplay:"googleplay",
 microsoft365:"microsoft365",teams:"microsoftteams",kakaotalk:"kakaotalk",imo:"imo",skype:"skype",
};
export function canonicalServiceBrand(id:string,name:string){
 const normalize=(v:string)=>v.toLowerCase().replace(/[^a-z0-9]/g,"");
 const a=normalize(id),b=normalize(name);
 const keys=Object.keys(aliases).sort((x,y)=>y.length-x.length);
 for(const key of keys){if(a===key||b===key||(key.length>=3&&(a.startsWith(key)||b.startsWith(key))))return aliases[key]}
 return "";
}
function serviceSlug(id:string,name:string){
 const brand=canonicalServiceBrand(id,name);
 if(brand)return brand;
 // Simple Icons hosts thousands of transparent, official brand SVGs. Use the
 // service's display name, never a numeric provider identifier, as the slug.
 return name.toLowerCase().replace(/[^a-z0-9]/g,"");
}
export default function ServiceLogo({id,name,className=""}:{id:string;name:string;className?:string}){
 const [failed,setFailed]=useState(false);
 const slug=serviceSlug(id,name);
 const initials=name.trim().split(/\s+/).filter(Boolean).slice(0,2).map(part=>part[0]).join("").toUpperCase()||"?";
 return <span className={className||"service-icon"} role="img" aria-label={name+" official brand mark"} style={{display:"inline-grid",placeItems:"center",flexShrink:0,overflow:"visible",position:"relative",background:"transparent",border:0,boxShadow:"none"}}>
  {slug&&!failed?<img src={"https://cdn.simpleicons.org/"+encodeURIComponent(slug)} alt="" width="56" height="56" loading="lazy" decoding="async" onError={()=>setFailed(true)} style={{width:"100%",height:"100%",objectFit:"contain",padding:0,boxSizing:"border-box",background:"transparent"}}/>:
   <span aria-hidden="true" style={{fontSize:16,fontWeight:850,letterSpacing:"-.04em",color:"rgba(190,215,245,.78)"}}>{initials}</span>}
 </span>
}
