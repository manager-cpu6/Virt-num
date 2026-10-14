import crypto from "crypto";

const BASE = "https://api.binance.com";
function credentials() {
  const key = String(process.env.BINANCE_API_KEY || "").trim();
  const secret = String(process.env.BINANCE_SECRET_KEY || "").trim();
  if (!key || !secret) throw new Error("BINANCE_PERSONAL_API_NOT_CONFIGURED");
  return { key, secret };
}
async function signedGet(path: string, params: Record<string, string | number | boolean> = {}) {
  const {key, secret} = credentials();
  const query = new URLSearchParams();
  for (const [k,v] of Object.entries({...params, timestamp: Date.now(), recvWindow: 5000})) query.set(k, String(v));
  const signature = crypto.createHmac("sha256", secret).update(query.toString()).digest("hex");
  query.set("signature", signature);
  const response = await fetch(BASE + path + "?" + query.toString(), {
    method: "GET",
    headers: {"X-MBX-APIKEY": key},
    cache: "no-store",
    signal: AbortSignal.timeout(12000)
  });
  const data:any = await response.json().catch(()=>null);
  if (!response.ok) {
    console.error("[BINANCE PERSONAL API]", path, response.status, data?.code, data?.msg);
    if (response.status === 401 || data?.code === -2015) throw new Error("BINANCE_PERSONAL_API_KEY_INVALID");
    throw new Error("BINANCE_PERSONAL_API_REQUEST_FAILED");
  }
  return data;
}
export type BinanceDeposit = {
  id?: string; amount: string; coin: string; network: string; status: number;
  address: string; addressTag?: string; txId: string; insertTime: number;
};
export async function getUsdtDepositInstructions() {
  const config:any[] = await signedGet("/sapi/v1/capital/config/getall");
  const usdt = config.find(x => String(x.coin).toUpperCase() === "USDT");
  if (!usdt) throw new Error("BINANCE_USDT_NOT_AVAILABLE");
  const networks:any[] = Array.isArray(usdt.networkList) ? usdt.networkList : [];
  const network = networks.find(x => x.depositEnable && x.isDefault) || networks.find(x => x.depositEnable);
  if (!network?.network) throw new Error("BINANCE_USDT_DEPOSIT_DISABLED");
  const data:any = await signedGet("/sapi/v1/capital/deposit/address", {coin:"USDT",network:String(network.network)});
  if (!data?.address) throw new Error("BINANCE_DEPOSIT_ADDRESS_UNAVAILABLE");
  return {address:String(data.address),network:String(network.network),networkName:String(network.name || network.network),memo:String(data.tag || data.addressTag || "")};
}
export async function getUsdtDeposits(startTime:number, endTime:number) {
  const data:any = await signedGet("/sapi/v1/capital/deposit/hisrec", {
    coin:"USDT", startTime, endTime, limit:1000
  });
  if (!Array.isArray(data)) throw new Error("BINANCE_DEPOSIT_HISTORY_INVALID");
  return data as BinanceDeposit[];
}
export function personalApiConfigured() {
  return Boolean(String(process.env.BINANCE_API_KEY||"").trim() && String(process.env.BINANCE_SECRET_KEY||"").trim());
}
