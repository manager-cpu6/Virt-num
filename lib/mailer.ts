import nodemailer from "nodemailer";
const port=Number(process.env.SPACEMAIL_SMTP_PORT||465);
export async function sendEmail(to:string,subject:string,html:string){
 if(!process.env.SPACEMAIL_SMTP_USER||!process.env.SPACEMAIL_SMTP_PASSWORD) throw new Error("Spacemail SMTP is not configured");
 const t=nodemailer.createTransport({host:process.env.SPACEMAIL_SMTP_HOST||"mail.spacemail.com",port,secure:port===465,auth:{user:process.env.SPACEMAIL_SMTP_USER,password:process.env.SPACEMAIL_SMTP_PASSWORD}});
 await t.sendMail({from:process.env.SPACEMAIL_FROM||process.env.SPACEMAIL_SMTP_USER,to,subject,html});
}
export function emailTemplate(title:string,text:string,url?:string){
 return `<div style="font-family:Arial;background:#f5f6f8;padding:32px"><div style="max-width:560px;margin:auto;background:#fff;border-radius:20px;padding:30px"><b style="font-size:22px">NUMELIXA</b><h1>${title}</h1><p style="color:#667085;line-height:1.6">${text}</p>${url?`<a href="${url}" style="display:inline-block;background:#111;color:#fff;padding:13px 18px;border-radius:10px;text-decoration:none">Continue</a>`:""}</div></div>`;
}