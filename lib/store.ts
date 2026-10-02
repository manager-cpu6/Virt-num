import {demoOrders,countries} from "./data";
let sequence=3;
export async function createDemoOrder(service:string,countryCode:string){const country=countries.find(c=>c.code===countryCode)||countries[0];const order={id:`demo-${String(sequence++).padStart(3,"0")}`,service,country:country.name,flag:country.flag,number:fakeNumber(country.code),status:"waiting" as const};demoOrders.unshift(order);return order}
export async function getDemoCode(orderId:string){if(!demoOrders.some(o=>o.id===orderId))throw new Error("Order not found");return{code:String(Math.floor(100000+Math.random()*900000)),receivedAt:new Date().toISOString()}}
function fakeNumber(code:string){const p:Record<string,string>={US:"+1 202",GB:"+44 7400",CA:"+1 416",DE:"+49 151",FR:"+33 6",ET:"+251 91"};return `${p[code]||"+1 202"} ${Math.floor(100000+Math.random()*899999)}`}
