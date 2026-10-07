import {collection} from "./mongo";

export type CoinPackage={coins:number;priceUsd:number;popular?:boolean};
export type PricingSettings={
  markupPercent:number;
  coinsPerUsd:number;
  minTopupUsd:number;
  maxTopupUsd:number;
  coinPackages:CoinPackage[];
  providerOperator:string;
  providerOperators:string[];
  smsProvider:"5sim"|"tiger";
  provider5simEnabled:boolean;
  providerTigerEnabled:boolean;
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
  ],
  providerOperator:"any",
  providerOperators:["any"],
  smsProvider:"5sim",
  provider5simEnabled:true,
  providerTigerEnabled:true
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
    coinPackages:coinPackages.length?coinPackages:defaults.coinPackages,
    providerOperator:String(s?.providerOperator||defaults.providerOperator).trim()||"any",
    providerOperators:Array.isArray(s?.providerOperators)&&s.providerOperators.length?s.providerOperators.map((x:any)=>String(x).trim().toLowerCase()).filter(Boolean):defaults.providerOperators,
    smsProvider:s?.smsProvider==="tiger"?"tiger":"5sim",
    provider5simEnabled:s?.provider5simEnabled!==false,
    providerTigerEnabled:s?.providerTigerEnabled!==false
  };
}

export function sellCoins(providerCost:number,s:PricingSettings){
  return Math.ceil(Number(providerCost)*(1+s.markupPercent/100)*s.coinsPerUsd)
}
