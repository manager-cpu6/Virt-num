"use client";
import {useMemo,useState} from "react";
type ReceiptData={receiptId:string;orderId:string;service:string;payerPhone:string;receiverPhone:string;transactionReference:string;amountEtb:number;amountUsd:number;exchangeRate:number;walletCredit:number;balanceAfter:number|null;paidAt:string|null;status:string;verification:string};
const code39:Record<string,string>={"0":"nnnwwnwnn","1":"wnnwnnnnw","2":"nnwwnnnnw","3":"wnwwnnnnn","4":"nnnwwnnnw","5":"wnnwwnnnn","6":"nnwwwnnnn","7":"nnnwnnwnw","8":"wnnwnnwnn","9":"nnwwnnwnn","A":"wnnnnwnnw","B":"nnwnnwnnw","C":"wnwnnwnnn","D":"nnnnwwnnw","E":"wnnnwwnnn","F":"nnwnwwnnn","G":"nnnnnwwnw","H":"wnnnnwwnn","I":"nnwnnwwnn","J":"nnnnwwwnn","K":"wnnnnnnww","L":"nnwnnnnww","M":"wnwnnnnwn","N":"nnnnwnnww","O":"wnnnwnnwn","P":"nnwnwnnwn","Q":"nnnnnnnww","R":"wnnnnnwnw","S":"nnwnnnwnw","T":"nnnnwnwnw","U":"wwnnnnnnw","V":"nwwnnnnnw","W":"wwwnnnnnn","X":"nwnnwnnnw","Y":"wwnwnnnnn","Z":"nwwnwnnnn","-":"nwnnnnwnw",".":"wwnnnwnnn"," ":"nwwnnwnnn","$":"nwnwnwnnn","/":"nwnwnnnwn","+":"nwnnnwnwn","%":"nnnwnwnwn","*":"nwnnwnwnn"};
function Barcode({value}:{value:string}){
 const encoded="*"+value.toUpperCase().replace(/[^0-9A-Z. $/+%-]/g,"")+"*";
 const bits=useMemo(()=>{let total=0;const bars:boolean[]=[],widths:number[]=[];for(const ch of encoded){const pattern=code39[ch]||code39["-"];for(let i=0;i<pattern.length;i++){const width=pattern[i]==="w"?3:1;widths.push(width);bars.push(i%2===0);total+=width;}widths.push(1);bars.push(false);total++;}return{bars,widths,total};},[encoded]);
 let cursor=0;return <svg role="img" aria-label={"Barcode for receipt "+value} viewBox={"0 0 "+bits.total+" 58"} width="100%" height="58" preserveAspectRatio="none" shapeRendering="crispEdges">{bits.bars.map((bar,i)=>{const x=cursor;cursor+=bits.widths[i];return bar?<rect key={i} x={x} y="0" width={bits.widths[i]} height="48" fill="#111827"/>:null;})}</svg>;
}
const usd=(n:number)=>new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(Number(n)||0);
const etb=(n:number)=>new Intl.NumberFormat("en-ET",{minimumFractionDigits:2,maximumFractionDigits:2}).format(Number(n)||0);
export default function PaymentReceipt({receipt,onContinue}:{receipt:ReceiptData|null;onContinue:()=>void}){
 const [message,setMessage]=useState("");
 async function share(){if(!receipt)return;const text="Numelixa verified payment receipt "+receipt.receiptId+" · "+usd(receipt.amountUsd)+(receipt.amountEtb>0?" · "+etb(receipt.amountEtb)+" ETB":"");try{if(navigator.share)await navigator.share({title:"Numelixa payment receipt",text});else{await navigator.clipboard.writeText(text);setMessage("Receipt details copied.");}}catch{}}
 if(!receipt)return <section className="nx-receipt-loading" aria-live="polite"><span className="nx-receipt-loader"/>Preparing your verified Numelixa receipt…</section>;
 return <section className="nx-payment-receipt" aria-label="Verified Numelixa payment receipt">
  <div className="nx-receipt-top"><div className="nx-receipt-brand"><span className="nx-receipt-brandmark">N</span><span><b>NUMELIXA</b><small>GLOBAL DIGITAL SERVICES</small></span></div><div className="nx-receipt-status"><i/> VERIFIED PAYMENT</div></div>
  <div className="nx-receipt-title"><span>OFFICIAL PAYMENT RECEIPT</span><h2>Payment received.</h2><p>Your wallet top-up has been verified and credited successfully.</p></div>
  <div className="nx-receipt-amount"><small>AMOUNT PAID</small><strong>{usd(receipt.amountUsd)}</strong><span>{receipt.amountEtb>0?etb(receipt.amountEtb)+" ETB":"Payment confirmed in USD"}</span></div>
  <div className="nx-receipt-stamp" aria-label="Numelixa verified official stamp"><div className="nx-stamp-ring"><span>NUMELIXA</span><b>✓</b><small>PAYMENT VERIFIED</small></div></div>
  <div className="nx-receipt-grid">
   <div><small>RECEIPT NUMBER</small><b>{receipt.receiptId}</b></div><div><small>PAYMENT METHOD</small><b>{receipt.service}</b></div>
   <div><small>SENDER NUMBER</small><b>{receipt.payerPhone||"Not provided"}</b></div><div><small>RECEIVING NUMBER</small><b>{receipt.receiverPhone||"—"}</b></div>
   <div><small>TRANSACTION REFERENCE</small><b>{receipt.transactionReference||"—"}</b></div><div><small>DATE & TIME (ADDIS ABABA)</small><b>{receipt.paidAt?new Intl.DateTimeFormat("en-ET",{dateStyle:"medium",timeStyle:"medium",timeZone:"Africa/Addis_Ababa"}).format(new Date(receipt.paidAt)):"—"}</b></div>
   {receipt.amountEtb>0&&<div><small>LOCAL AMOUNT PAID</small><b>{etb(receipt.amountEtb)} ETB</b></div>}{receipt.exchangeRate>0&&<div><small>EXCHANGE RATE</small><b>1 USD = {etb(receipt.exchangeRate)} ETB</b></div>}<div><small>WALLET CREDIT</small><b>{receipt.walletCredit.toLocaleString("en-US")} credits</b></div>
   {receipt.balanceAfter!==null&&<div className="wide"><small>UPDATED WALLET BALANCE</small><b>{receipt.balanceAfter.toLocaleString("en-US")} credits</b></div>}
  </div>
  <div className="nx-receipt-barcode"><Barcode value={receipt.receiptId}/><b>{receipt.receiptId}</b><small>Scan the barcode, then verify this code at</small><a href={"/receipt/verify?code="+encodeURIComponent(receipt.receiptId)}>numelixa.com/receipt/verify</a></div>
  <div className="nx-receipt-proof"><b>Verification record</b><p>{receipt.verification}</p><span>Receipt issued from the Numelixa payment ledger after successful server-side credit.</span></div>
  <div className="nx-receipt-actions"><button type="button" onClick={()=>window.print()}>Print / Save PDF</button><button type="button" onClick={share}>Share receipt</button></div>
  {message&&<p className="nx-receipt-message" role="status">{message}</p>}
  <button className="nx-receipt-continue" type="button" onClick={onContinue}>Continue to wallet <span>→</span></button>
  <footer>Thank you for choosing Numelixa · numelixa.com</footer>
 </section>;
}
