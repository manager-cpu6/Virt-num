import type {MetadataRoute} from "next";
import {headers} from "next/headers";

export const dynamic="force-dynamic";

export default async function sitemap():Promise<MetadataRoute.Sitemap>{
 const host=(await headers()).get("host")?.split(":")[0].toLowerCase()||"numelixa.com";
 if(host==="app.numelixa.com")return [{url:"https://app.numelixa.com/",lastModified:new Date(),changeFrequency:"weekly",priority:1}];
 const base="https://numelixa.com";
 const paths=["/","/services","/android","/ios","/wallet","/numbers","/account","/docs","/privacy"];
 return [
  ...paths.map(path=>({url:base+path,lastModified:new Date(),changeFrequency:path==="/"?"daily" as const:"weekly" as const,priority:path==="/" ? 1 : 0.7})),
  {url:"https://app.numelixa.com/",lastModified:new Date(),changeFrequency:"weekly",priority:0.9}
 ];
}