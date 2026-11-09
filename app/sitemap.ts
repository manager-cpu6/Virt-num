import type {MetadataRoute} from "next";
import {headers} from "next/headers";

export const dynamic="force-dynamic";

export default async function sitemap():Promise<MetadataRoute.Sitemap>{
 const host=(await headers()).get("host")?.split(":")[0].toLowerCase()||"";
 const isDownloadHost=host==="app.numelixa.com";
 const base=isDownloadHost?"https://app.numelixa.com":"https://numelixa.com";
 const paths=isDownloadHost?["/","/android"]:["/","/services","/android","/ios","/wallet","/numbers","/account","/docs","/privacy"];
 return paths.map(path=>({url:base+path,lastModified:new Date(),changeFrequency:path==="/"? "daily":"weekly",priority:path==="/" ? 1 : 0.7}));
}
