"use client";
import {useState} from "react";

const aliases:Record<string,string>={
 wa:"whatsapp",whatsapp:"whatsapp",whatsappbusiness:"whatsapp",fb:"facebook",facebook:"facebook",facebooklite:"facebook",
 ig:"instagram",instagram:"instagram",instagramlite:"instagram",threads:"threads",tg:"telegram",telegram:"telegram",telegramx:"telegram",
 tt:"tiktok",tiktok:"tiktok",tiktoklite:"tiktok",go:"google",google:"google",googlevoice:"googlevoice",gmail:"gmail",youtube:"youtube",youtubemusic:"youtubemusic",
 am:"amazon",amazon:"amazon",amazonprime:"amazon",amazonshop:"amazon",op:"openai",openai:"openai",chatgpt:"openai",claudeai:"claude",
 tw:"x",twitter:"x",x:"x",ms:"microsoft",microsoft:"microsoft",microsoftteams:"microsoftteams",ap:"apple",apple:"apple",
 oi:"openai",sn:"snapchat",snapchat:"snapchat",ds:"discord",discord:"discord",li:"linkedin",linkedin:"linkedin",pp:"paypal",paypal:"paypal",
 rd:"reddit",reddit:"reddit",sp:"spotify",spotify:"spotify",nf:"netflix",netflix:"netflix",vb:"viber",viber:"viber",sg:"signal",signal:"signal",
 vk:"vk",yandex:"yandex",binance:"binance",bybit:"bybit",okx:"okx",ebay:"ebay",uber:"uber",airbnb:"airbnb",pinterest:"pinterest",twitch:"twitch",
 steam:"steam",dropbox:"dropbox",slack:"slack",zoom:"zoom",notion:"notion",canva:"canva",figma:"figma",capcut:"capcut",protonmail:"protonmail"
};
const domains:Record<string,string>={
 whatsapp:"whatsapp.com",facebook:"facebook.com",instagram:"instagram.com",threads:"threads.net",telegram:"telegram.org",tiktok:"tiktok.com",
 google:"google.com",googlevoice:"voice.google.com",gmail:"mail.google.com",youtube:"youtube.com",youtubemusic:"music.youtube.com",
 amazon:"amazon.com",openai:"openai.com",claude:"claude.ai",x:"x.com",microsoft:"microsoft.com",microsoftteams:"teams.microsoft.com",apple:"apple.com",
 snapchat:"snapchat.com",discord:"discord.com",linkedin:"linkedin.com",paypal:"paypal.com",reddit:"reddit.com",spotify:"spotify.com",
 netflix:"netflix.com",viber:"viber.com",signal:"signal.org",vk:"vk.com",yandex:"yandex.com",binance:"binance.com",bybit:"bybit.com",
 okx:"okx.com",ebay:"ebay.com",uber:"uber.com",airbnb:"airbnb.com",pinterest:"pinterest.com",twitch:"twitch.tv",steam:"steampowered.com",
 dropbox:"dropbox.com",slack:"slack.com",zoom:"zoom.us",notion:"notion.so",canva:"canva.com",figma:"figma.com",capcut:"capcut.com",protonmail:"proton.me"
};
export function canonicalServiceBrand(id:string,name:string){
 const normalize=(v:string)=>v.toLowerCase().replace(/[^a-z0-9]/g,"");
 const a=normalize(id),b=normalize(name);
 const keys=Object.keys(aliases).sort((x,y)=>y.length-x.length);
 for(const key of keys){if(a===key||a.startsWith(key)||b===key||b.startsWith(key))return aliases[key]}
 return a||b||"service";
}
export default function ServiceLogo({id,name,className=""}:{id:string;name:string;className?:string}){
 const [failed,setFailed]=useState(false);
 const brand=canonicalServiceBrand(id,name);
 const domain=domains[brand]||domains[brand.replace(/(lite|business|prime|shop|app)$/,"")]||((brand&&brand!=="service")?brand+".com":"google.com");
 const src=failed?"https://www.google.com/s2/favicons?domain="+encodeURIComponent(domain)+"&sz=128":"https://cdn.simpleicons.org/"+encodeURIComponent(brand);
 return <span className={className||"service-icon"} style={{display:"inline-grid",placeItems:"center",flexShrink:0,overflow:"hidden"}}>
  <img src={src} alt={name+" logo"} loading="lazy" onError={()=>{if(!failed)setFailed(true)}} style={{width:"100%",height:"100%",objectFit:"contain",padding:5,boxSizing:"border-box"}}/>
 </span>
}
