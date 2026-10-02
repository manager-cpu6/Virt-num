type ProviderResult={ok:boolean;raw?:unknown;error?:string};
const base=process.env.SMSPOOL_BASE_URL||"https://api.smspool.net";
const key=process.env.SMSPOOL_API_KEY;
export function providerConfigured(){return Boolean(key)}
export async function smspoolHealth():Promise<ProviderResult>{if(!key)return{ok:false,error:"SMSPool API key is not configured"};return{ok:true,raw:{base,configured:true}}}
// Keep provider credentials server-side. Map the exact current SMSPool account endpoints
// and service/country IDs here before enabling live purchases. The mock mode is the default preview path.
