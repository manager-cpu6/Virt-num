import nodemailer from "nodemailer";
import {createHash} from "crypto";

const DEFAULT_HOST="mail.spacemail.com";
const DEFAULT_PORT=465;
type SmtpConfig={host:string;port:number;user:string;pass:string;from:string};

function isRateLimitedError(error:unknown){
 const text=String(error instanceof Error?error.message:error||"").toLowerCase();
 return text.includes("too many messages")||text.includes("rate limit")||text.includes("rate limited")||text.includes("5.7.1");
}

function fallbackConfig():SmtpConfig|null{
 const user=String(process.env.SPACEMAIL_FALLBACK_USER||"").trim();
 const pass=String(process.env.SPACEMAIL_FALLBACK_PASSWORD||"");
 if(!user||!pass)return null;
 const host=String(process.env.SPACEMAIL_FALLBACK_HOST||DEFAULT_HOST).trim();
 const port=Number(process.env.SPACEMAIL_FALLBACK_PORT||DEFAULT_PORT);
 const from=String(process.env.SPACEMAIL_FALLBACK_FROM||user).trim();
 if(!host||!Number.isFinite(port)||!from.includes("@"))return null;
 return{host,port,user,pass,from};
}

type SenderKey="info"|"payment"|"welcome"|"noreply"|"forgot"|"withdrawal"|"team"|"system"|"notification"|"receipts";
const SENDER_ADDRESS:Record<SenderKey,string>={
 info:"info@numelixa.com",payment:"payment@numelixa.com",welcome:"welcome@numelixa.com",
 noreply:"noreplay@numelixa.com",forgot:"forgot@numelixa.com",withdrawal:"request@numelixa.com",team:"team@numelixa.com",system:"system@numelixa.com",
 notification:"notification@numelixa.com",receipts:"receipts@numelixa.com"
};
const SENDER_PREFIX:Record<SenderKey,string>={
 info:"SPACEMAIL_INFO",payment:"SPACEMAIL_PAYMENT",welcome:"SPACEMAIL_WELCOME",
 noreply:"SPACEMAIL_NOREPLAY",forgot:"SPACEMAIL_FORGOT",withdrawal:"SPACEMAIL_WITHDRAWAL",team:"SPACEMAIL_TEAM",system:"SPACEMAIL_SYSTEM",
 notification:"SPACEMAIL_NOTIFICATION",receipts:"SPACEMAIL_RECEIPTS"
};
function smtpConfig(sender:SenderKey="info"):SmtpConfig{
 const prefix=SENDER_PREFIX[sender];
 const host=(process.env[prefix+"_HOST"]||(sender==="receipts"?process.env.SPACEMAIL_PAYMENT_HOST:"")||process.env.SPACEMAIL_SMTP_HOST||DEFAULT_HOST).trim();
 const port=Number(process.env[prefix+"_PORT"]||(sender==="receipts"?process.env.SPACEMAIL_PAYMENT_PORT:"")||process.env.SPACEMAIL_SMTP_PORT||DEFAULT_PORT);
 const user=(process.env[prefix+"_USER"]||(sender==="receipts"?process.env.SPACEMAIL_PAYMENT_USER:"")||process.env.SPACEMAIL_SMTP_USER||"info@numelixa.com").trim();
 const pass=process.env[prefix+"_PASSWORD"]||(sender==="receipts"?process.env.SPACEMAIL_PAYMENT_PASSWORD:"")||process.env.SPACEMAIL_SMTP_PASSWORD||"";
 const from=(process.env[prefix+"_FROM"]||SENDER_ADDRESS[sender]).trim();
 if(!user)throw new Error("Spacemail SMTP username is missing for "+sender+".");
 if(!pass)throw new Error("Spacemail SMTP password is missing for "+sender+".");
 if(!Number.isFinite(port)||port<=0||port>65535)throw new Error("Invalid Spacemail SMTP port.");
 if(!from||!from.includes("@"))throw new Error("Spacemail sender address is missing or invalid.");
 return{host,port,user,pass,from};
}
function plain(html:string){return html.replace(/<style[^>]*>[\s\S]*?<\/style>/gi,"").replace(/<br\s*\/?>(?=.)/gi,"\n").replace(/<\/(p|div|h1|h2|h3|li)>/gi,"\n").replace(/<[^>]+>/g,"").replace(/&nbsp;/g," ").replace(/&amp;/g,"&").replace(/&lt;/g,"<").replace(/&gt;/g,">").replace(/\n{3,}/g,"\n\n").trim();}
function makeTransporter(config:SmtpConfig){const credentialFingerprint=createHash("sha256").update(config.pass).digest("hex").slice(0,20);const key="__numelixa_mailer_"+config.host+"_"+config.port+"_"+config.user+"_"+credentialFingerprint;
 const g=globalThis as any;
 if(g[key])return g[key];
 const transporter=nodemailer.createTransport({host:config.host,port:config.port,secure:config.port===465,requireTLS:config.port===587,auth:{user:config.user,pass:config.pass},tls:{minVersion:"TLSv1.2",servername:config.host},connectionTimeout:8000,greetingTimeout:8000,socketTimeout:12000,pool:true,maxConnections:3,maxMessages:50} as any);
 g[key]=transporter;
 return transporter;}
async function sendWithConfig(config:SmtpConfig,to:string,subject:string,html:string,sender:SenderKey){const transporter=makeTransporter(config);const domain=config.from.split("@")[1];const displayName:Record<SenderKey,string>={info:"Numelixa",payment:"Numelixa Payments",welcome:"Numelixa Welcome",noreply:"Numelixa",forgot:"Numelixa Account Security",withdrawal:"Numelixa Withdrawals",team:"Numelixa Support",system:"Numelixa",notification:"Numelixa",receipts:"Numelixa Receipts"};await transporter.sendMail({from:'"'+displayName[sender]+'" <'+config.from+'>',to,replyTo:"support@numelixa.com",subject,text:plain(html),html,messageId:"<numelixa-"+Date.now()+"-"+Math.random().toString(36).slice(2,10)+"@"+domain+">",date:new Date(),headers:{"X-Mailer":"Numelixa Transactional Mail","X-Application":"Numelixa","Auto-Submitted":"auto-generated"}});}
function isSocketTlsError(error:unknown){const e=error as {code?:unknown;message?:unknown}|null;const code=String(e?.code||"");const message=String(e?.message||"").toLowerCase();return["ESOCKET","ECONNRESET","ETIMEDOUT","EPIPE","ECONNREFUSED"].includes(code)||message.includes("secure tls")||message.includes("network socket disconnected")||message.includes("socket disconnected");}
export async function sendEmail(to:string,subject:string,html:string){return sendEmailFrom("info",to,subject,html);}
export async function sendEmailFrom(sender:SenderKey,to:string,subject:string,html:string){
 const config=smtpConfig(sender);
 try{
  await sendWithConfig(config,to,subject,html,sender);
  return;
 }catch(error){
  // A TLS/socket failure is safe to retry once. A provider rate limit is not:
  // hammering the same mailbox makes the block last longer.
  if(!isRateLimitedError(error)&&config.port===465&&isSocketTlsError(error)){
   try{await sendWithConfig({...config,port:587},to,subject,html,sender);return;}
   catch(fallbackError){
    if(isRateLimitedError(fallbackError)){
     const fallback=fallbackConfig();
     if(fallback){await sendWithConfig({...fallback,from:SENDER_ADDRESS[sender]},to,subject,html,sender);return;}
    }
    const message=fallbackError instanceof Error?fallbackError.message:String(fallbackError);
    throw new Error("Spacemail SMTP error: "+message);
   }
  }
  if(!isRateLimitedError(error)&&isSocketTlsError(error)){
   await new Promise(resolve=>setTimeout(resolve,350));
   try{await sendWithConfig(config,to,subject,html,sender);return;}catch{}
  }
  if(isRateLimitedError(error)){
   const fallback=fallbackConfig();
   if(fallback){
    try{await sendWithConfig({...fallback,from:SENDER_ADDRESS[sender]},to,subject,html,sender);return;}catch(fallbackError){
     const message=fallbackError instanceof Error?fallbackError.message:String(fallbackError);
     throw new Error("EMAIL_RATE_LIMITED: "+message);
    }
   }
   throw new Error("EMAIL_RATE_LIMITED: Your Numelixa mail server has temporarily limited outgoing messages. Please wait a little before requesting another code.");
  }
  const message=error instanceof Error?error.message:String(error);
  throw new Error("Spacemail SMTP error: "+message);
 } 
}

const shell=(content:string,preheader:string)=>{
 const logo='<img src="https://numelixa.com/numelixa-app-icon.webp" width="56" height="56" alt="Numelixa" style="display:block;width:56px;height:56px;object-fit:contain;border:0;margin:0 auto" />';
 return '<!doctype html><html><head><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="dark"></head><body style="margin:0;background:#070910;font-family:Arial,Helvetica,sans-serif;color:#f4f6fb"><div style="display:none;max-height:0;overflow:hidden;opacity:0">'+preheader+'</div><div style="padding:34px 14px;background:#070910;min-height:100vh"><div style="max-width:590px;margin:auto"><div style="padding:4px 8px 18px">'+logo+'<div style="margin-top:10px;font-size:11px;font-weight:800;letter-spacing:3px;color:#aab2c2">NUMELIXA</div></div><div style="background:#10131d;border:1px solid #252b3a;border-radius:28px;padding:30px 26px;box-shadow:0 18px 48px rgba(0,0,0,.24)">'+content+'</div><div style="padding:22px 8px;text-align:center;color:#858fa2;font-size:11px;line-height:1.6">Numelixa · Virtual numbers. Connected.<br><a href="mailto:support@numelixa.com" style="color:#b8c2d5;text-decoration:underline">support@numelixa.com</a> · <a href="https://support.numelixa.com" style="color:#b8c2d5;text-decoration:underline">Support Center</a><br>© 2026 Numelixa. All rights reserved.</div></div></div></body></html>';
};

export function verificationEmail(code:string){
 return shell('<div style="font-size:10px;font-weight:900;letter-spacing:2.2px;color:#62ddca">EMAIL VERIFICATION</div><h1 style="font-size:31px;line-height:1.1;margin:10px 0;color:#f2fffc">Verify your email</h1><p style="font-size:14px;line-height:1.7;color:#a9ccca">Use the secure code below to confirm your Numelixa account.</p><div style="margin:22px 0;padding:22px;border-radius:20px;background:#041d25;border:1px solid rgba(100,235,211,.18);text-align:center"><div style="font-size:36px;letter-spacing:8px;font-weight:900;color:#f2fffc">'+code+'</div><div style="margin-top:8px;font-size:10px;color:#6e999a">Expires in 10 minutes</div></div><p style="font-size:11px;color:#709294;line-height:1.6">Never share this code. If you did not request it, you can safely ignore this email.</p>','Your Numelixa email verification code expires in 10 minutes.');
}
export function welcomeEmail(name:string){
 return shell('<div style="font-size:11px;font-weight:800;letter-spacing:2px;color:#62ddca">WELCOME TO NUMELIXA</div><h1 style="font-size:31px;line-height:1.1;margin:10px 0;color:#f2fffc">Welcome, '+escapeHtml(name)+' 👋</h1><p style="font-size:14px;line-height:1.7;color:#a9ccca">Your account is ready. You can now manage your wallet, virtual numbers and SMS codes from one clean dashboard.</p><div style="margin:24px 0;padding:18px;border-radius:18px;background:linear-gradient(135deg,rgba(48,187,167,.14),rgba(10,72,79,.35));border:1px solid rgba(100,235,211,.13)"><b style="font-size:14px;color:#dffff8">Your Numelixa journey starts here.</b><p style="font-size:12px;color:#82a8a8;line-height:1.6;margin:7px 0 0">Choose a service → choose a country → get your number → receive your SMS.</p></div>','Welcome to Numelixa — your account is ready.');
}
export function passwordResetEmail(name:string,url:string){
 return shell('<div style="font-size:11px;font-weight:800;letter-spacing:2px;color:#62ddca">ACCOUNT SECURITY</div><h1 style="font-size:31px;line-height:1.1;margin:10px 0;color:#f2fffc">Reset your password</h1><p style="font-size:14px;line-height:1.7;color:#a9ccca">Hi '+escapeHtml(name||"there")+', we received a request to reset your Numelixa password.</p><p><a href="'+url+'" style="display:inline-block;background:linear-gradient(135deg,#62e5cf,#2bbda9);color:#032027;padding:14px 22px;border-radius:14px;text-decoration:none;font-weight:900;font-size:13px">Reset password →</a></p><div style="margin-top:20px;padding:14px;border-radius:14px;background:#041d25;color:#789c9d;font-size:11px;line-height:1.6">This link expires in 30 minutes. If you did not request a password reset, no action is required.</div>','Secure Numelixa password reset link — expires in 30 minutes.');
}
export function purchaseSuccessEmail(name:string,service:string,country:string,number:string,price:number,url:string){
 const priceUsd=Number(price||0);
 const html='<div style="font-size:11px;font-weight:800;letter-spacing:2px;color:#62ddca">PURCHASE COMPLETE</div>'
  +'<h1 style="font-size:31px;line-height:1.1;margin:10px 0;color:#f2fffc">Number secured 🎉</h1>'
  +'<p style="font-size:14px;line-height:1.7;color:#a9ccca">Hi '+escapeHtml(name||"there")+', congratulations! Your Numelixa number was purchased successfully.</p>'
  +'<div style="margin:24px 0;padding:20px;border-radius:20px;background:#041d25;border:1px solid rgba(100,235,211,.18)">'
  +'<div style="font-size:10px;color:#679596;letter-spacing:1.5px;font-weight:800">SERVICE</div>'
  +'<div style="font-size:18px;font-weight:900;margin:5px 0 15px;color:#edfffb">'+escapeHtml(service)+'</div>'
  +'<div style="font-size:10px;color:#679596;letter-spacing:1.5px;font-weight:800">NUMBER</div>'
  +'<div style="font-size:24px;font-weight:900;margin-top:5px;color:#62e5cf">'+escapeHtml(number)+'</div>'
  +'<div style="font-size:11px;color:#789c9d;margin-top:10px">'+escapeHtml(country)+' · $'+priceUsd.toFixed(2)+' USD</div></div>'
  +'<p><a href="'+url+'" style="display:inline-block;background:linear-gradient(135deg,#62e5cf,#2bbda9);color:#032027;padding:14px 22px;border-radius:14px;text-decoration:none;font-weight:900;font-size:13px">Open SMS & Get Code →</a></p>';
 return shell(html,'Congratulations — your Numelixa number purchase was successful.');
}
function escapeHtml(value:string){return String(value).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");}
export function emailTemplate(title:string,text:string,url?:string,preheader="Numelixa account security"){return shell('<h1 style="font-size:27px;color:#f2fffc">'+title+'</h1><p style="font-size:14px;line-height:1.7;color:#a9ccca">'+text+'</p>'+(url?'<p><a href="'+url+'" style="display:inline-block;background:linear-gradient(135deg,#62e5cf,#2bbda9);color:#032027;padding:14px 22px;border-radius:14px;text-decoration:none;font-weight:900">Continue to Numelixa →</a></p>':'') ,' '+preheader);}

export function coinPaymentSuccessEmail(name:string,_internalBalance:number,amountUsd:number,currency:string,reference:string){
 const safe=(v:string)=>String(v).replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;").replace(/'/g,"&#39;");
 const amount=Number(amountUsd||0).toFixed(2);
 const content='<div style="font-size:11px;font-weight:800;letter-spacing:2px;color:#62ddca">PAYMENT CONFIRMED</div><h1 style="font-size:31px;line-height:1.1;margin:10px 0;color:#f2fffc">Your wallet is topped up! 🎉</h1><p style="font-size:14px;line-height:1.7;color:#a9ccca">Hi '+safe(name||"there")+', your payment was received successfully and your Numelixa USD wallet has been updated.</p><div style="margin:24px 0;padding:22px;border-radius:20px;background:#041d25;border:1px solid rgba(100,235,211,.18);text-align:center"><div style="font-size:10px;color:#679596;letter-spacing:1.5px;font-weight:800">AMOUNT ADDED</div><div style="font-size:36px;font-weight:900;margin:8px 0;color:#62e5cf">$'+amount+'</div><div style="font-size:12px;color:#a9ccca">USD wallet balance credit</div><div style="margin-top:16px;padding-top:15px;border-top:1px solid rgba(100,235,211,.13);font-size:13px;color:#dffff8">Payment amount: $'+amount+' USD</div><div style="margin-top:7px;font-size:11px;color:#789c9d">Payment method: '+safe(currency||"Crypto")+'</div><div style="margin-top:7px;font-size:10px;color:#789c9d;word-break:break-all">Reference: '+safe(reference||"confirmed")+'</div></div><p style="font-size:13px;line-height:1.7;color:#a9ccca">Thank you for choosing Numelixa. Your USD balance is ready to use for virtual numbers and SMS verification.</p><p><a href="https://numelixa.com/wallet" style="display:inline-block;background:linear-gradient(135deg,#62e5cf,#2bbda9);color:#032027;padding:14px 22px;border-radius:14px;text-decoration:none;font-weight:900;font-size:13px">Open your wallet →</a></p>';
 return shell(content,'Payment confirmed — $'+amount+' USD was added to your Numelixa wallet.');
}

export function ethiopiaPaymentReceiptEmail(name:string,receiptId:string,service:string,payerPhone:string,receiverPhone:string,amountUsd:number,amountEtb:number,reference:string,paidAt:string){
 const safe=(v:string)=>escapeHtml(String(v||"—"));
 const usd=Number(amountUsd||0).toFixed(2),etb=Number(amountEtb||0).toLocaleString("en-ET",{minimumFractionDigits:2,maximumFractionDigits:2});
 const rows=[["Receipt ID",receiptId],["Payment service",service],["Payer number",payerPhone],["Receiving number",receiverPhone],["Transaction reference",reference],["Date",paidAt]];
 const detailRows=rows.map(([label,value])=>'<tr><td style="padding:11px 4px;border-bottom:1px solid #e8eef5;color:#718096;font-size:12px">'+safe(label)+'</td><td style="padding:11px 4px;border-bottom:1px solid #e8eef5;color:#17233b;font-size:12px;text-align:right;font-weight:700;word-break:break-word">'+safe(value)+'</td></tr>').join("");
 return '<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light"></head><body style="margin:0;padding:24px 10px;background:#f1f5f9;font-family:Arial,Helvetica,sans-serif;color:#17233b"><div style="max-width:620px;margin:0 auto;background:#fff;border:1px solid #e2e8f0;border-radius:20px;overflow:hidden"><div style="padding:22px 26px;background:#fff;border-bottom:1px solid #e8eef5"><div style="font-size:20px;font-weight:900;letter-spacing:2px;color:#123b72">NUMELIXA</div><div style="margin-top:4px;color:#64748b;font-size:10px;letter-spacing:1.6px;font-weight:800">GLOBAL VIRTUAL NUMBERS</div></div><div style="padding:28px 26px"><div style="text-align:center"><div style="font-size:10px;letter-spacing:2px;color:#168a74;font-weight:900">OFFICIAL PAYMENT RECEIPT</div><h1 style="font-size:28px;color:#102a4c;margin:10px 0 6px">Payment verified</h1><p style="margin:0;color:#64748b;font-size:13px">Hello '+safe(name||"there")+', your payment was received and confirmed.</p><div style="display:inline-block;margin:20px auto 4px;width:112px;height:112px;border:4px double #168a74;border-radius:50%;color:#168a74;box-sizing:border-box;padding-top:22px;transform:rotate(-8deg)"><div style="font-size:31px;font-weight:900;line-height:1">✓</div><div style="font-size:9px;font-weight:900;letter-spacing:1px;margin-top:4px">VERIFIED</div><div style="font-size:8px;font-weight:800;margin-top:3px">NUMELIXA</div></div></div><div style="margin:22px 0;padding:22px;border-radius:14px;background:#f7fafc;border:1px solid #e2e8f0;text-align:center"><div style="font-size:10px;letter-spacing:1.5px;font-weight:900;color:#718096">AMOUNT RECEIVED</div><div style="font-size:34px;font-weight:900;color:#102a4c;margin:8px 0">$'+usd+' USD</div><div style="font-size:15px;color:#168a74;font-weight:800">'+etb+' ETB</div></div><table role="presentation" style="width:100%;border-collapse:collapse">'+detailRows+'</table><div style="text-align:center;margin:20px auto 8px"><img src="https://numelixa.com/brand/numelixa-official-branding.jpg" width="210" alt="Official Numelixa seal and signature" style="display:block;width:210px;max-width:75%;height:auto;margin:0 auto;border:0"></div><p style="font-size:12px;line-height:1.7;color:#64748b;margin:22px 0 0">The incoming payment SMS, payer number, exact amount, receiving SIM and transaction reference were matched. Your Numelixa USD wallet has been credited successfully.</p><div style="text-align:center;margin:24px 0 4px"><a href="https://numelixa.com/wallet" style="display:inline-block;padding:13px 22px;border-radius:11px;background:#1677ff;color:#fff;text-decoration:none;font-size:13px;font-weight:900">Open Numelixa Wallet</a></div></div><div style="padding:18px 26px;background:#f8fafc;border-top:1px solid #e8eef5;color:#94a3b8;font-size:10px;text-align:center;line-height:1.7">Numelixa · Secure digital services<br>Keep this receipt for your records. Never share your password or OTP code.</div></div></body></html>';
}
