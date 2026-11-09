import type {MetadataRoute} from "next";
import {headers} from "next/headers";

export const dynamic="force-dynamic";

export default async function robots():Promise<MetadataRoute.Robots>{
  const host=(await headers()).get("host")?.split(":")[0].toLowerCase()||"";
  const base=host==="app.numelixa.com"?"https://app.numelixa.com":"https://numelixa.com";
  return {
    rules:{userAgent:"*",allow:"/"},
    sitemap:base+"/sitemap.xml"
  };
}
