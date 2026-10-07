const base=()=>String(process.env.INFOBIP_BASE_URL||"").trim().replace(/\/$/,"");
const smsKey=()=>String(process.env.INFOBIP_SMS_API_KEY||"").trim();
const voiceKey=()=>String(process.env.INFOBIP_VOICE_API_KEY||"").trim();

function assertConfig(kind:"sms"|"voice"){
 if(!base()) throw new Error("INFOBIP_BASE_URL_MISSING");
 if(kind==="sms"){
  if(!smsKey()) throw new Error("INFOBIP_SMS_API_KEY_MISSING");
  if(!String(process.env.INFOBIP_SMS_SENDER||"").trim()) throw new Error("INFOBIP_SMS_SENDER_MISSING");
 }
 if(kind==="voice"){
  if(!voiceKey()) throw new Error("INFOBIP_VOICE_API_KEY_MISSING");
  if(!String(process.env.INFOBIP_VOICE_SENDER||"").trim()) throw new Error("INFOBIP_VOICE_SENDER_MISSING");
 }
}

async function call(path:string,body:any,key:string){
 const r=await fetch(base()+path,{method:"POST",headers:{Authorization:"App "+key,"Content-Type":"application/json",Accept:"application/json"},body:JSON.stringify(body),cache:"no-store"});
 const raw=await r.text();
 let data:any;try{data=JSON.parse(raw)}catch{data={raw}};
 if(!r.ok){
  const detail=data?.requestError?.serviceException?.text||data?.description||"Infobip request failed";
  throw new Error("INFOBIP_"+r.status+":"+String(detail).slice(0,300));
 }
 return data;
}

export async function sendSmsOtp(to:string,code:string){
 assertConfig("sms");
 return call("/sms/3/messages",{messages:[{sender:String(process.env.INFOBIP_SMS_SENDER).trim(),destinations:[{to}],content:{text:"Your Numelixa verification code is "+code+". It expires in 10 minutes."}}]},smsKey());
}

export async function sendVoiceOtp(to:string,code:string){
 assertConfig("voice");
 const spaced=code.split("").join(" ");
 return call("/tts/3/advanced",{bulkId:"Numelixa OTP",messages:[{text:"Hello. Your Numelixa verification code is "+spaced+". I repeat: "+spaced+".",language:String(process.env.INFOBIP_VOICE_LANGUAGE||"en"),voice:{name:String(process.env.INFOBIP_VOICE_NAME||"Joanna"),gender:String(process.env.INFOBIP_VOICE_GENDER||"female")},speechRate:Number(process.env.INFOBIP_VOICE_SPEECH_RATE||0.8),from:String(process.env.INFOBIP_VOICE_SENDER).trim(),destinations:[{to}]}]},voiceKey());
}
