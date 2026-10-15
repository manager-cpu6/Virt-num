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
export const BINANCE_COIN_NAMES:Record<string,string>={
 USDT:"Tether USD",USDC:"USD Coin",FDUSD:"First Digital USD",TUSD:"TrueUSD",USDP:"Pax Dollar",DAI:"Dai",
 BNB:"BNB",BTC:"Bitcoin",ETH:"Ethereum",SOL:"Solana",XRP:"XRP",TRX:"TRON",TON:"Toncoin",DOGE:"Dogecoin",
 ADA:"Cardano",LTC:"Litecoin",BCH:"Bitcoin Cash",LINK:"Chainlink",AVAX:"Avalanche",DOT:"Polkadot",
 MATIC:"Polygon",POL:"POL",ATOM:"Cosmos",ETC:"Ethereum Classic",NEAR:"NEAR Protocol",APT:"Aptos",
 SUI:"Sui",SHIB:"Shiba Inu",PEPE:"Pepe",UNI:"Uniswap",AAVE:"Aave",FIL:"Filecoin",ARB:"Arbitrum",
 OP:"Optimism",ICP:"Internet Computer",XLM:"Stellar",ALGO:"Algorand",VET:"VeChain",FTM:"Fantom",
 XMR:"Monero",EOS:"EOS",INJ:"Injective",SEI:"Sei",RENDER:"Render",FET:"Artificial Superintelligence",
 HBAR:"Hedera",MKR:"Maker",CRV:"Curve DAO",GRT:"The Graph",SAND:"The Sandbox",MANA:"Decentraland",
 AXS:"Axie Infinity",THETA:"Theta Network",EGLD:"MultiversX",ZEC:"Zcash",XTZ:"Tezos",KAVA:"Kava",
 RUNE:"THORChain",WLD:"Worldcoin",JUP:"Jupiter",PAXG:"PAX Gold",ENS:"Ethereum Name Service"
};
const logoSymbol:Record<string,string>={USDT:"tether",USDC:"usd-coin",FDUSD:"first-digital-usd",TUSD:"true-usd",DAI:"dai",BNB:"binancecoin",BTC:"bitcoin",ETH:"ethereum",SOL:"solana",XRP:"xrp",TRX:"tron",TON:"the-open-network",DOGE:"dogecoin",ADA:"cardano",LTC:"litecoin",BCH:"bitcoin-cash",LINK:"chainlink",AVAX:"avalanche-2",DOT:"polkadot",MATIC:"matic-network",POL:"polygon-ecosystem-token",ATOM:"cosmos",ETC:"ethereum-classic",NEAR:"near",APT:"aptos",SUI:"sui",SHIB:"shiba-inu",PEPE:"pepe",UNI:"uniswap",AAVE:"aave",FIL:"filecoin",ARB:"arbitrum",OP:"optimism",ICP:"internet-computer",XLM:"stellar",ALGO:"algorand",VET:"vechain",FTM:"fantom",XMR:"monero",EOS:"eos",INJ:"injective-protocol",SEI:"sei-network",RENDER:"render-token",FET:"fetch-ai",HBAR:"hedera-hashgraph",MKR:"maker",CRV:"curve-dao-token",GRT:"the-graph",SAND:"the-sandbox",MANA:"decentraland",AXS:"axie-infinity",THETA:"theta-token",EGLD:"elrond-erd-2",ZEC:"zcash",XTZ:"tezos",KAVA:"kava",RUNE:"thorchain",WLD:"worldcoin-wld",JUP:"jupiter-exchange-solana",PAXG:"pax-gold",ENS:"ethereum-name-service"};
export function getCoinDisplayName(coin:string){const c=String(coin||"").toUpperCase();return BINANCE_COIN_NAMES[c]||c;}
export function getCoinLogo(coin:string){
 // The spothq cryptocurrency-icons repository uses ticker filenames (usdt.png,
 // bnb.png, btc.png), not CoinGecko-style asset slugs such as tether.png.
 const c=String(coin||"").trim().toLowerCase();
 return "https://raw.githubusercontent.com/spothq/cryptocurrency-icons/master/128/color/"+encodeURIComponent(c)+".png";
}
export function getCoinLogoFallback(coin:string){
 const c=String(coin||"").toUpperCase().replace(/[^A-Z0-9]/g,"").slice(0,6)||"COIN";
 const svg='<svg xmlns="http://www.w3.org/2000/svg" width="128" height="128" viewBox="0 0 128 128"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop stop-color="#1677ff"/><stop offset="1" stop-color="#00d9ff"/></linearGradient></defs><circle cx="64" cy="64" r="62" fill="#071329"/><circle cx="64" cy="64" r="52" fill="url(#g)"/><text x="64" y="73" font-family="Arial,sans-serif" font-size="'+(c.length>4?25:c.length>3?30:38)+'" font-weight="700" text-anchor="middle" fill="white">'+c+'</text></svg>';
 return "data:image/svg+xml;charset=UTF-8,"+encodeURIComponent(svg);
}

export async function getAvailableDepositAssets(){
 const config:any[]=await signedGet("/sapi/v1/capital/config/getall");
 let exchange:any=null,tickers:any[]=[];
 try{
  const [infoResponse,tickerResponse]=await Promise.all([
   binanceFetch(BASE+"/api/v3/exchangeInfo",{cache:"no-store",signal:AbortSignal.timeout(12000)}),
   binanceFetch(BASE+"/api/v3/ticker/price",{cache:"no-store",signal:AbortSignal.timeout(12000)})
  ]);
  if(infoResponse.ok&&tickerResponse.ok){exchange=await infoResponse.json();tickers=await tickerResponse.json();}
 }catch(e){console.error("[BINANCE ASSET PRICES]",e instanceof Error?e.message:"unavailable");}
 if(!exchange||!Array.isArray(tickers))throw new Error("BINANCE_ASSET_PRICES_UNAVAILABLE");
 const symbols=new Set((exchange.symbols||[]).filter((s:any)=>s.status==="TRADING"&&s.quoteAsset==="USDT").map((s:any)=>s.baseAsset));
 const prices=new Map<string,number>(tickers.map((t:any)=>[String(t.symbol||""),Number(t.price)]));
 const stable=new Set(["USDT","USDC","FDUSD","TUSD","USDP","DAI"]);
 const rows:any[]=[];
 for(const row of config){
  const coin=String(row.coin||"").toUpperCase();
  if(!/^[A-Z0-9]{2,15}$/.test(coin)||!Array.isArray(row.networkList))continue;
  const networks=row.networkList.filter((n:any)=>n.depositEnable&&!n.busy&&n.network).map((n:any)=>({network:String(n.network),networkName:String(n.name||n.network),isDefault:Boolean(n.isDefault),busy:Boolean(n.busy)})).sort((a:any,b:any)=>Number(b.isDefault)-Number(a.isDefault)||a.networkName.localeCompare(b.networkName));
  if(!networks.length)continue;
  const price=stable.has(coin)?1:prices.get(coin+"USDT");
  if(!Number.isFinite(price)||Number(price)<=0||!symbols.has(coin)&&!stable.has(coin))continue;
  rows.push({coin,name:String(row.name||getCoinDisplayName(coin)),logo:getCoinLogo(coin),usdPrice:Number(price),networks});
 }
 const priority=["USDT","USDC","BTC","ETH","BNB","SOL","XRP","TRX","TON","DOGE","ADA","LTC","BCH","LINK","AVAX","DOT","SHIB","PEPE","FDUSD","TUSD","DAI"];
 return rows.sort((a,b)=>{const ai=priority.indexOf(a.coin),bi=priority.indexOf(b.coin);return (ai<0?999:ai)-(bi<0?999:bi)||a.name.localeCompare(b.name);});
}
export async function getCoinNetworks(coin:string) {
  const asset=String(coin||"").toUpperCase();
  if(!/^[A-Z0-9]{2,15}$/.test(asset))throw new Error("BINANCE_COIN_NOT_SUPPORTED");
  const config:any[] = await signedGet("/sapi/v1/capital/config/getall");
  const row=config.find(x=>String(x.coin).toUpperCase()===asset);
  if(!row)throw new Error("BINANCE_"+asset+"_NOT_AVAILABLE");
  const networks:any[]=Array.isArray(row.networkList)?row.networkList:[];
  return networks.filter(x=>x.depositEnable&&!x.busy&&x.network).map(x=>({
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
  if(!/^[A-Z0-9]{2,15}$/.test(asset))throw new Error("BINANCE_COIN_NOT_SUPPORTED");
  const data:any=await signedGet("/sapi/v1/capital/deposit/hisrec",{coin:asset,startTime,endTime,limit:1000});
  if(!Array.isArray(data))throw new Error("BINANCE_DEPOSIT_HISTORY_INVALID");
  return data as BinanceDeposit[];
}
export async function getUsdtNetworks(){return getCoinNetworks("USDT");}
export async function getUsdtDepositInstructions(requestedNetwork?:string){return getCoinDepositInstructions("USDT",requestedNetwork);}
export async function getUsdtDeposits(startTime:number,endTime:number){return getCoinDeposits("USDT",startTime,endTime);}
export async function getCryptoUsdPrice(coin:string){
  const asset=String(coin||"").toUpperCase();
  if(["USDT","USDC","FDUSD","TUSD","USDP","DAI"].includes(asset))return 1;
  if(!/^[A-Z0-9]{2,15}$/.test(asset))throw new Error("BINANCE_COIN_NOT_SUPPORTED");
  let response:Response;
  try{response=await binanceFetch(BASE+"/api/v3/ticker/price?symbol="+encodeURIComponent(asset+"USDT"),{cache:"no-store",signal:AbortSignal.timeout(10000)});}
  catch{throw new Error("BINANCE_NETWORK_ERROR");}
  const data:any=await response.json().catch(()=>null);
  const price=Number(data?.price);
  if(!response.ok||!Number.isFinite(price)||price<=0)throw new Error("BINANCE_"+asset+"_PRICE_UNAVAILABLE");
  return price;
}
export function personalApiConfigured() {
  return Boolean(String(process.env.BINANCE_API_KEY||"").trim() && String(process.env.BINANCE_SECRET_KEY||"").trim());
}
