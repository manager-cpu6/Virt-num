import crypto from "crypto";
const merchant=process.env.CRYPTOMUS_MERCHANT_ID?.trim();
const apiKey=process.env.CRYPTOMUS_PAYMENT_API_KEY?.trim();
function signature(body:string){if(!apiKey)throw new Error("Cryptomus payment API key is not configured.");return crypto.createHash("md5").update(Buffer.from(body).toString("base64")+apiKey).digest("hex")}
export async function createInvoice(input:{amount:string;order_id:string;url_return:string;url_success:string;url_callback:string}){
 if(!merchant)throw new Error("Cryptomus Merchant ID is not configured.");
 if(!apiKey)throw new Error("Cryptomus Payment API key is not configured.");
 const body=JSON.stringify({amount:input.amount,currency:"USD",order_id:input.order_id,url_return:input.url_return,url_success:input.url_success,url_callback:input.url_callback});
 const r=await fetch("https://api.cryptomus.com/v1/payment",{method:"POST",headers:{merchant,"sign":signature(body),"Content-Type":"application/json","Accept":"application/json"},body,cache:"no-store"});
 const j=await r.json().catch(()=>null);
 if(!r.ok||j?.state!==0){
  const msg=String(j?.message||j?.error?.message||"Cryptomus invoice request failed");
  if(/api\s*not\s*active/i.test(msg))throw new Error("Cryptomus API is not active. Activate the Merchant Payment API and use the Payment API key (not the Payout key), then redeploy Vercel.");
  if(/merchant/i.test(msg)&&/moder/i.test(msg))throw new Error("Cryptomus merchant is still under moderation. Complete merchant/domain verification before using the Payment API.");
  throw new Error(`Cryptomus: ${msg}`);
 }
 if(!j?.result?.url)throw new Error("Cryptomus returned no payment URL.");
 return j.result;
}
export function verifyWebhook(data:any){
 if(!apiKey||!data?.sign)return false;const received=String(data.sign);const copy={...data};delete copy.sign;const expected=signature(JSON.stringify(copy));if(expected.length!==received.length)return false;return crypto.timingSafeEqual(Buffer.from(expected),Buffer.from(received));
}
