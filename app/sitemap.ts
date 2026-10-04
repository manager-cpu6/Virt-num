import type {MetadataRoute} from "next";
export default function sitemap():MetadataRoute.Sitemap{
 const base="https://numelixa.com";
 const paths=["/","/services","/android","/ios","/wallet","/numbers","/account","/docs","/privacy"];
 return paths.map(path=>({url:base+path,lastModified:new Date(),changeFrequency:path==="/"?"daily":"weekly",priority:path==="/" ? 1 : 0.7}));
}
