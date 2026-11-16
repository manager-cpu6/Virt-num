import {NextResponse} from "next/server";
import {applyReferralReward} from "@/lib/referrals";
import crypto from "crypto";
import {collection,mongoId} from "@/lib/mongo";
import {notifyUser} from "@/lib/notifications";

export const runtime="nodejs";
export const dynamic="force-dynamic";

function validSignature(headers:Headers,raw:string){
 const signature=headers.get("binancepay-signature")||"";
 const timestamp=headers.get("binancepay-timestamp")||"";
 const nonce=headers.get("binancepay-nonce")||"";
 const cert=headers.get("binancepay-certificate-sn")||"";
 const expectedCert=String(process.env.BINANCE_PAY_CERT_SERIAL||process.env.BINANCE_PAY_API_KEY||"");
 if(!signature||!timestamp||!nonce||!cert||cert!==expectedCert)return false;
 const publicKey=String(process.env.BINANCE_PAY_PUBLIC_KEY||"").replace(/\\n/g,"\n");
 try{return crypto.verify("RSA-SHA256",Buffer.from(timestamp+"\n"+nonce+"\n"+raw+"\n"),publicKey,Buffer.from(signature,"base64"));}catch{return false;}
