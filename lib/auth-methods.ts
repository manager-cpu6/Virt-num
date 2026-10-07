import {collection} from "@/lib/mongo";
export type AuthSettings={phoneEnabled:boolean;voiceEnabled:boolean};
export async function getAuthSettings():Promise<AuthSettings>{
 const s=await (await collection<any>("settings")).findOne({_id:"auth_methods"});
 return {phoneEnabled:s?.phoneEnabled!==false,voiceEnabled:s?.voiceEnabled!==false};
}
export async function setAuthSettings(next:AuthSettings){
 await (await collection<any>("settings")).replaceOne({_id:"auth_methods"},{_id:"auth_methods",phoneEnabled:Boolean(next.phoneEnabled),voiceEnabled:Boolean(next.voiceEnabled),updatedAt:new Date()},{upsert:true});
 return getAuthSettings();
}
