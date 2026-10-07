import * as five from "@/lib/fivesim";
import * as tiger from "@/lib/tigersms";
import {getSettings} from "@/lib/settings";
export type SmsProvider="5sim"|"tiger";
export async function activeProvider():Promise<SmsProvider>{
 const s=await getSettings(); return s.smsProvider==="tiger"?"tiger":"5sim";
}
export async function providerName(){return (await activeProvider())==="tiger"?"Tiger SMS":"5SIM"}
export async function configured(){return (await activeProvider())==="tiger"?tiger.providerConfigured():five.providerConfigured()}
export async function balance(){return (await activeProvider())==="tiger"?tiger.balance():five.balance()}
export async function listCountries(){return (await activeProvider())==="tiger"?tiger.listCountries():five.listCountries()}
export async function listServices(){return (await activeProvider())==="tiger"?tiger.listServices():five.listServices()}
export async function servicePrices(service:string,countries:any[]=[]){return (await activeProvider())==="tiger"?tiger.servicePrices(service,countries):five.servicePrices(service,countries)}
export async function getPrice(country:string,service:string,operator="any"){return (await activeProvider())==="tiger"?tiger.getPrice(country,service,operator):five.getPrice(country,service,operator)}
export async function purchase(country:string,service:string,maxPrice?:number,operator="any"){return (await activeProvider())==="tiger"?tiger.purchase(country,service,maxPrice,operator):five.purchase(country,service,maxPrice,operator)}
export async function check(orderid:string,provider?:SmsProvider){const p=provider||await activeProvider();return p==="tiger"?tiger.check(orderid):five.check(orderid)}
export async function finalize(orderid:string,provider?:SmsProvider){const p=provider||await activeProvider();return p==="tiger"?tiger.finalize(orderid):five.finalize(orderid)}
export async function cancel(orderid:string,provider?:SmsProvider){const p=provider||await activeProvider();return p==="tiger"?tiger.cancel(orderid):five.cancel(orderid)}
