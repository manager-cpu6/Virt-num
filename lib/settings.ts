import {collection} from "./mongo";
export type PricingSettings={markupPercent:number;coinsPerUsd:number;minTopupUsd:number;maxTopupUsd:number};
const defaults:PricingSettings={markupPercent:25,coinsPerUsd:100,minTopupUsd:1,maxTopupUsd:10000};
export async function getSettings():Promise<PricingSettings>{
 const s=await (await collection<any>("settings")).findOne({_id:"pricing"});
 return {markupPercent:Number(s?.markupPercent??defaults.markupPercent),coinsPerUsd:Number(s?.coinsPerUsd??defaults.coinsPerUsd),minTopupUsd:Number(s?.minTopupUsd??defaults.minTopupUsd),maxTopupUsd:Number(s?.maxTopupUsd??defaults.maxTopupUsd)};
}
export function sellCoins(providerCost:number,s:PricingSettings){return Math.ceil(Number(providerCost)*(1+s.markupPercent/100)*s.coinsPerUsd)}
