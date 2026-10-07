import {NextResponse} from "next/server";import {collection,mongoId} from "@/lib/mongo";import {getAuthSettings} from "@/lib/auth-methods";import {sendSmsOtp,sendVoiceOtp} from "@/lib/infobip";import crypto from "crypto";
export const runtime="nodejs";export const dynamic="force-dynamic";
const hash=(v:string)=>crypto.createHash("sha256").update(v).digest("hex");
const normalize=(v:string)=>{let x=String(v||"").replace(/[^\d+]/g,"");if(x.startsWith("00"))x="+"+x.slice(2);if(!x.startsWith("+"))x="+"+x;return x};
const valid=(x:string)=>/^\+[1-9]\d{7,14}$/.test(x);
async function send(req:Request,mode:"sms"|"voice"){
 const settings=await getAuthSettings();
 if(!settings.phoneEnabled)return NextResponse.json({ok:false,error:"Phone sign in is currently unavailable."},{status:403});
 if(mode==="voice"&&!settings.voiceEnabled)return NextResponse.json({ok:false,error:"Voice verification is currently unavailable."},{status:403});
 const b=await req.json().catch(()=>({})),phone=normalize(b.phone),name=String(b.name||"").trim(),purpose=b.purpose==="signup"?"signup":"login";
 if(!valid(phone))return NextResponse.json({ok:false,error:"Enter a valid international phone number, for example +251..."},{status:400});
 const users=await collection<any>("users"),existing=await users.findOne({phone});
 if(purpose==="signup"&&existing)return NextResponse.json({ok:false,error:"This phone number is already registered. Sign in instead."},{status:409});
 if(purpose==="login"&&!existing)return NextResponse.json({ok:false,error:"No Numelixa account is registered with this phone number. Create an account first."},{status:404});
 const now=new Date(),otps=await collection<any>("phoneOtps");
 const recent=await otps.findOne({phone,createdAt:{$gt:new Date(Date.now()-60*1000)}});
 if(recent)return NextResponse.json({ok:false,error:"Please wait 60 seconds before requesting another code.",retryAfter:60},{status:429});
 const code=String(Math.floor(100000+Math.random()*900000));
 await otps.deleteMany({phone});
 await otps.insertOne({_id:mongoId(),phone,name,purpose,codeHash:hash(code),expiresAt:new Date(Date.now()+10*60*1000),createdAt:now,attempts:0});
 try{if(mode==="voice")await sendVoiceOtp(phone,code);else await sendSmsOtp(phone,code)}
 catch(e){await otps.deleteMany({phone,codeHash:hash(code)});const m=e instanceof Error?e.message:"Unable to send OTP";console.error("[PHONE OTP]",m);return NextResponse.json({ok:false,error:m==="INFOBIP_NOT_CONFIGURED"?"Phone verification is not configured yet.":m.startsWith("INFOBIP_")?"The verification provider rejected the request. Please try again.":"Unable to send verification code."},{status:503})}
 return NextResponse.json({ok:true,phone:phone.replace(/^(\+\d{2})\d+/, "$1••••••••"),mode,expiresAt:new Date(Date.now()+10*60*1000).toISOString()});
}
export async function POST(req:Request){return send(req,"sms")}export async function PUT(req:Request){return send(req,"voice")}
