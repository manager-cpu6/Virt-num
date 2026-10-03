import {NextResponse} from "next/server";
import {listCountries,providerConfigured} from "@/lib/smspool";
import {countries as fallbackCountries} from "@/lib/data";
export const runtime="nodejs";
export const dynamic="force-dynamic";
function flag(name:string){const a:Record<string,string>={"united states":"US","united kingdom":"GB","canada":"CA","germany":"DE","france":"FR","netherlands":"NL","spain":"ES","australia":"AU","ethiopia":"ET","kenya":"KE","somalia":"SO","nigeria":"NG","south africa":"ZA","tanzania":"TZ","uganda":"UG","ghana":"GH","rwanda":"RW","burundi":"BI","cameroon":"CM","china":"CN","turkey":"TR"};const code=a[name.toLowerCase().trim()]||"";return code?String.fromCodePoint(...[...code].map(c=>127397+c.charCodeAt(0))):"🌐"}
const fallback=fallbackCountries.map(c=>({id:c.code,code:c.code,name:c.name,short_name:c.name,flag:c.flag||flag(c.name)}));
export async function GET(){
  try{
    if(!providerConfigured())return NextResponse.json({ok:true,live:false,countries:fallback});
    const countries=(await listCountries()).map((c:any)=>({...c,flag:flag(String(c.name||c.eng||c.rus||""))}));
    return NextResponse.json({ok:true,live:true,countries});
  }catch{
    return NextResponse.json({ok:true,live:false,countries:fallback});
  }
}
