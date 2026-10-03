import {collection} from "./mongo";

export type CoinPackage={coins:number;priceUsd:number;popular?:boolean};
export type PricingSettings={
  markupPercent:number;
  coinsPerUsd:number;
  minTopupUsd:number;
  maxTopupUsd:number;
  coinPackages:CoinPackage[];
};

const defaults:PricingSettings={
  markupPercent:25,
  coinsPerUsd:100,
  minTopupUsd:1,
  maxTopupUsd:10000,
  coinPackages:[
    {coins:500,priceUsd:5},
    {coins:1000,priceUsd:10},
    {coins:2500,priceUsd:25,popular:true},
    {coins:5000,priceUsd:50}
  ]
};

export async function getSettings():Promise<PricingSettings>{
  const s=await (await collection<any>("settings")).findOne({_id:"pricing"});
  const raw=Array.isArray(s?.coinPackages)?s.coinPackages:[];
  const coinPackages=raw
    .map((p:any)=>({coins:Math.floor(Number(p?.coins)),priceUsd:Number(p?.priceUsd),popular:Boolean(p?.popular)}))
    .filter((p:CoinPackage)=>Number.isFinite(p.coins)&&p.coins>0&&Number.isFinite(p.priceUsd)&&p.priceUsd>0)
    .slice(0,8);
  return {
    markupPercent:Number(s?.markupPercent??defaults.markupPercent),
    coinsPerUsd:Number(s?.coinsPerUsd??defaults.coinsPerUsd),
    minTopupUsd:Number(s?.minTopupUsd??defaults.minTopupUsd),
    maxTopupUsd:Number(s?.maxTopupUsd??defaults.maxTopupUsd),
    coinPackages:coinPackages.length?coinPackages:defaults.coinPackages
  };
}

export function sellCoins(providerCost:number,s:PricingSettings){
  return Math.ceil(Number(providerCost)*(1+s.markupPercent/100)*s.coinsPerUsd)
}
