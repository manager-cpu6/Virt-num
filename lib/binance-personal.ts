import crypto from "crypto";
import {ProxyAgent} from "undici";

const BASE = "https://api.binance.com";
let proxyAgent: ProxyAgent | null = null;
function getBinanceProxyAgent(){
  const proxyUrl=String(process.env.FIXIE_URL||"").trim();
  if(!proxyUrl)throw new Error("BINANCE_FIXIE_URL_NOT_CONFIGURED");
  if(!proxyAgent)proxyAgent=new ProxyAgent(proxyUrl);
  return proxyAgent;
}
async function binanceFetch(url:string,init:RequestInit={}){
  const dispatcher=getBinanceProxyAgent();
  return fetch(url,{...init,dispatcher} as RequestInit & {dispatcher:ProxyAgent});
}
function credentials() {
  const key = String(process.env.BINANCE_API_KEY || "").trim();
  const secret = String(process.env.BINANCE_SECRET_KEY || "").trim();
  if (!key || !secret) throw new Error("BINANCE_PERSONAL_API_NOT_CONFIGURED");
  return { key, secret };
}
let serverTimeOffset = 0;
async function syncServerTime(){
  try{
    const response=await binanceFetch(BASE+"/api/v3/time",{cache:"no-store",signal:AbortSignal.timeout(8000)});
    const data:any=await response.json().catch(()=>null);
    if(response.ok&&Number.isFinite(Number(data?.serverTime)))serverTimeOffset=Number(data.serverTime)-Date.now();
  }catch{}
}
async function signedGet(path: string, params: Record<string, string | number | boolean> = {}) {
  const {key, secret} = credentials();
  for(let attempt=0;attempt<2;attempt++){
    const query = new URLSearchParams();
    for (const [k,v] of Object.entries({...params, timestamp: Date.now()+serverTimeOffset, recvWindow: 10000})) query.set(k, String(v));
    const signature = crypto.createHmac("sha256", secret).update(query.toString()).digest("hex");
    query.set("signature", signature);
    let response:Response;
    try{
      response=await binanceFetch(BASE+path+"?"+query.toString(),{
        method:"GET",
        headers:{"X-MBX-APIKEY":key},
        cache:"no-store",
        signal:AbortSignal.timeout(15000)
      });
    }catch(error){
      const message=error instanceof Error?error.message:"";
      console.error("[BINANCE PERSONAL API NETWORK]",path,error instanceof Error?error.name:"unknown");
      if(message==="BINANCE_FIXIE_URL_NOT_CONFIGURED")throw error;
      throw new Error("BINANCE_NETWORK_ERROR");
    }
    const data:any=await response.json().catch(()=>null);
    if(response.ok)return data;
    const code=Number(data?.code);
    console.error("[BINANCE PERSONAL API]",path,response.status,code,data?.msg);
    if(code===-1021&&attempt===0){await syncServerTime();continue;}
    if(response.status===401||code===-2015||code===-2014)throw new Error("BINANCE_API_AUTH_ERROR_"+String(code));
    if(code===-1021)throw new Error("BINANCE_API_TIMESTAMP_ERROR");
    if(code===-1003||response.status===429)throw new Error("BINANCE_API_RATE_LIMIT");
    if(code===-1000||code===-1001||response.status>=500)throw new Error("BINANCE_API_TEMPORARY_ERROR");
    if(code===-2010||code===-2008)throw new Error("BINANCE_API_PERMISSION_ERROR_"+String(code));
    throw new Error("BINANCE_API_REQUEST_ERROR_"+String(code||response.status));
  }
  throw new Error("BINANCE_API_TIMESTAMP_ERROR");
}
export type BinanceDeposit = {
  id?: string; amount: string; coin: string; network: string; status: number;
  address: string; addressTag?: string; txId: string; insertTime: number;
};
export async function getCoinNetworks(coin:string) {
  const asset=String(coin||"").toUpperCase();
  if(!["USDT","BNB"].includes(asset))throw new Error("BINANCE_COIN_NOT_SUPPORTED");
  const config:any[] = await signedGet("/sapi/v1/capital/config/getall");
  const row=config.find(x=>String(x.coin).toUpperCase()===asset);
  if(!row)throw new Error("BINANCE_"+asset+"_NOT_AVAILABLE");
  const networks:any[]=Array.isArray(row.networkList)?row.networkList:[];
  return networks.filter(x=>x.depositEnable&&x.network).map(x=>({
    network:String(x.network),networkName:String(x.name||x.network),
    isDefault:Boolean(x.isDefault),busy:Boolean(x.busy),
  })).sort((a,b)=>Number(b.isDefault)-Number(a.isDefault)||a.networkName.localeCompare(b.networkName));
}
export async function getCoinDepositInstructions(coin:string,requestedNetwork?:string) {
  const asset=String(coin||"").toUpperCase();
  const networks=await getCoinNetworks(asset);
  const network=requestedNetwork?networks.find(x=>x.network===requestedNetwork):networks.find(x=>x.isDefault)||networks[0];
  if(!network)throw new Error("BINANCE_"+asset+"_DEPOSIT_DISABLED");
  const data:any=await signedGet("/sapi/v1/capital/deposit/address",{coin:asset,network:network.network});
  if(!data?.address)throw new Error("BINANCE_DEPOSIT_ADDRESS_UNAVAILABLE");
  return {address:String(data.address),network:network.network,networkName:network.networkName,memo:String(data.tag||data.addressTag||"")};
}
export async function getCoinDeposits(coin:string,startTime:number,endTime:number) {
  const asset=String(coin||"").toUpperCase();
  if(!["USDT","BNB"].includes(asset))throw new Error("BINANCE_COIN_NOT_SUPPORTED");
  const data:any=await signedGet("/sapi/v1/capital/deposit/hisrec",{coin:asset,startTime,endTime,limit:1000});
  if(!Array.isArray(data))throw new Error("BINANCE_DEPOSIT_HISTORY_INVALID");
  return data as BinanceDeposit[];
}
export async function getUsdtNetworks(){return getCoinNetworks("USDT");}
export async function getUsdtDepositInstructions(requestedNetwork?:string){return getCoinDepositInstructions("USDT",requestedNetwork);}
export async function getUsdtDeposits(startTime:number,endTime:number){return getCoinDeposits("USDT",startTime,endTime);}
export async function getCryptoUsdPrice(coin:string){
  const asset=String(coin||"").toUpperCase();
  if(asset==="USDT")return 1;
  if(asset!=="BNB")throw new Error("BINANCE_COIN_NOT_SUPPORTED");
  let response:Response;
  try{response=await binanceFetch(BASE+"/api/v3/ticker/price?symbol=BNBUSDT",{cache:"no-store",signal:AbortSignal.timeout(10000)});}
  catch{throw new Error("BINANCE_NETWORK_ERROR");}
  const data:any=await response.json().catch(()=>null);
  const price=Number(data?.price);
  if(!response.ok||!Number.isFinite(price)||price<=0)throw new Error("BINANCE_BNB_PRICE_UNAVAILABLE");
  return price;
}
export function personalApiConfigured() {
  return Boolean(String(process.env.BINANCE_API_KEY||"").trim() && String(process.env.BINANCE_SECRET_KEY||"").trim());
}
