"use client";
import {useMemo,useState} from "react";
type ReceiptData={receiptId:string;orderId:string;service:string;payerName?:string;payerPhone:string;receiverPhone:string;transactionReference:string;amountEtb:number;amountUsd:number;exchangeRate:number;walletCredit:number;balanceAfter:number|null;paidAt:string|null;status:string;verification:string};
const code39:Record<string,string>={"0":"nnnwwnwnn","1":"wnnwnnnnw","2":"nnwwnnnnw","3":"wnwwnnnnn","4":"nnnwwnnnw","5":"wnnwwnnnn","6":"nnwwwnnnn","7":"nnnwnnwnw","8":"wnnwnnwnn","9":"nnwwnnwnn","A":"wnnnnwnnw","B":"nnwnnwnnw","C":"wnwnnwnnn","D":"nnnnwwnnw","E":"wnnnwwnnn","F":"nnwnwwnnn","G":"nnnnnwwnw","H":"wnnnnwwnn","I":"nnwnnwwnn","J":"nnnnwwwnn","K":"wnnnnnnww","L":"nnwnnnnww","M":"wnwnnnnwn","N":"nnnnwnnww","O":"wnnnwnnwn","P":"nnwnwnnwn","Q":"nnnnnnnww","R":"wnnnnnwnw","S":"nnwnnnwnw","T":"nnnnwnwnw","U":"wwnnnnnnw","V":"nwwnnnnnw","W":"wwwnnnnnn","X":"nwnnwnnnw","Y":"wwnwnnnnn","Z":"nwwnwnnnn","-":"nwnnnnwnw",".":"wwnnnwnnn"," ":"nwwnnwnnn","$":"nwnwnwnnn","/":"nwnwnnnwn","+":"nwnnnwnwn","%":"nnnwnwnwn","*":"nwnnwnwnn"};
function Barcode({value}:{value:string}){
 const encoded="*"+value.toUpperCase().replace(/[^0-9A-Z. $/+%-]/g,"")+"*";
 const bits=useMemo(()=>{let total=0;const bars:boolean[]=[],widths:number[]=[];for(const ch of encoded){const pattern=code39[ch]||code39["-"];for(let i=0;i<pattern.length;i++){const width=pattern[i]==="w"?3:1;widths.push(width);bars.push(i%2===0);total+=width;}widths.push(1);bars.push(false);total++;}return{bars,widths,total};},[encoded]);
 let cursor=10;return <svg role="img" aria-label={"Barcode for receipt "+value} viewBox={"0 0 "+(bits.total+20)+" 58"} width="100%" height="58" preserveAspectRatio="none" shapeRendering="crispEdges">{bits.bars.map((bar,i)=>{const x=cursor;cursor+=bits.widths[i];return bar?<rect key={i} x={x} y="0" width={bits.widths[i]} height="48" fill="#111827"/>:null;})}</svg>;
}
const usd=(n:number)=>new Intl.NumberFormat("en-US",{style:"currency",currency:"USD"}).format(Number(n)||0);
const etb=(n:number)=>new Intl.NumberFormat("en-ET",{maximumFractionDigits:0}).format(Math.ceil(Number(n)||0));
export default function PaymentReceipt({receipt,onContinue}:{receipt:ReceiptData|null;onContinue:()=>void}){
 const [message,setMessage]=useState("");const [emailBusy,setEmailBusy]=useState(false);
 async function emailReceipt(){if(!receipt)return;setEmailBusy(true);setMessage("");try{const response=await fetch("/api/wallet/receipt/email",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({reference:receipt.orderId})});const data=await response.json();if(!response.ok||!data.ok)throw new Error(data.error||"Unable to email receipt.");setMessage("Receipt sent to "+data.email+".")}catch(error){setMessage(error instanceof Error?error.message:"Unable to email receipt.")}finally{setEmailBusy(false)}}
 async function share(){if(!receipt)return;const text="Numelixa verified payment receipt "+receipt.receiptId+" · "+usd(receipt.amountUsd)+(receipt.amountEtb>0?" · "+etb(receipt.amountEtb)+" ETB":"");try{if(navigator.share)await navigator.share({title:"Numelixa payment receipt",text});else{await navigator.clipboard.writeText(text);setMessage("Receipt details copied.");}}catch{}}
 if(!receipt)return <section className="nx-receipt-loading" aria-live="polite"><span className="nx-receipt-loader"/>Preparing your verified Numelixa receipt…</section>;
 return <section className="nx-payment-receipt" aria-label="Verified Numelixa payment receipt" style={{width:"100%",maxWidth:302,margin:"0 auto",padding:"22px 20px 18px",background:"#fff",color:"#111827",border:"1px solid #d8dee8",boxShadow:"0 16px 42px rgba(15,23,42,.13)",fontFamily:"'Courier New',monospace"}}>
  <div style={{textAlign:"center",paddingBottom:14,borderBottom:"2px dashed #94a3b8"}}>
   <img src="/numelixa-app-icon.webp" alt="Numelixa" width="48" height="48" style={{display:"block",width:48,height:48,objectFit:"contain",margin:"0 auto 7px"}}/>
   <div style={{fontSize:22,fontWeight:900,letterSpacing:3,color:"#102a56"}}>NUMELIXA</div>
   <div style={{fontSize:9,letterSpacing:1.8,fontWeight:800,color:"#64748b",marginTop:4}}>GLOBAL DIGITAL SERVICES</div>
   <div style={{fontSize:10,fontWeight:900,letterSpacing:1.5,color:"#087d65",marginTop:12}}>✓ VERIFIED PAYMENT</div>
   <h2 style={{fontFamily:"Arial,Helvetica,sans-serif",fontSize:19,margin:"10px 0 4px",color:"#111827"}}>OFFICIAL PAYMENT RECEIPT</h2>
   <p style={{fontFamily:"Arial,Helvetica,sans-serif",fontSize:11,color:"#64748b",margin:0}}>Your wallet payment has been verified and credited.</p>
  </div>
  <div style={{textAlign:"center",padding:"17px 8px",borderBottom:"1px dashed #94a3b8"}}>
   <div style={{fontSize:9,fontWeight:900,letterSpacing:2,color:"#64748b"}}>AMOUNT RECEIVED</div>
   <strong style={{display:"block",fontFamily:"Arial,Helvetica,sans-serif",fontSize:32,color:"#0f172a",margin:"7px 0"}}>{usd(receipt.amountUsd)}</strong>
   <span style={{fontSize:12,fontWeight:800,color:"#166534"}}>{receipt.amountEtb>0?etb(receipt.amountEtb)+" ETB":"PAYMENT CONFIRMED"}</span>
  </div>
  <div style={{padding:"12px 0 8px"}}>
   <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"12px 10px",fontFamily:"Arial,Helvetica,sans-serif"}}>
    <div><small style={{display:"block",fontSize:9,color:"#64748b",fontWeight:800}}>RECEIPT NUMBER</small><b style={{fontSize:11,wordBreak:"break-word"}}>{receipt.receiptId}</b></div>
    <div><small style={{display:"block",fontSize:9,color:"#64748b",fontWeight:800}}>PAYMENT METHOD</small><b style={{fontSize:11}}>{receipt.service}</b></div>
    <div><small style={{display:"block",fontSize:9,color:"#64748b",fontWeight:800}}>PAYER NAME</small><b style={{fontSize:11}}>{receipt.payerName||"Not provided"}</b></div>
    <div><small style={{display:"block",fontSize:9,color:"#64748b",fontWeight:800}}>SENDER NUMBER</small><b style={{fontSize:11}}>{receipt.payerPhone||"Not provided"}</b></div>
    <div><small style={{display:"block",fontSize:9,color:"#64748b",fontWeight:800}}>RECEIVING NUMBER</small><b style={{fontSize:11}}>{receipt.receiverPhone||"—"}</b></div>
    <div><small style={{display:"block",fontSize:9,color:"#64748b",fontWeight:800}}>TRANSACTION REF</small><b style={{fontSize:11,wordBreak:"break-word"}}>{receipt.transactionReference||"—"}</b></div>
    <div style={{gridColumn:"1 / -1"}}><small style={{display:"block",fontSize:9,color:"#64748b",fontWeight:800}}>DATE & TIME · ADDIS ABABA</small><b style={{fontSize:11}}>{receipt.paidAt?new Intl.DateTimeFormat("en-ET",{dateStyle:"medium",timeStyle:"medium",timeZone:"Africa/Addis_Ababa"}).format(new Date(receipt.paidAt)):"—"}</b></div>
    {receipt.amountEtb>0&&<div><small style={{display:"block",fontSize:9,color:"#64748b",fontWeight:800}}>LOCAL PAYMENT</small><b style={{fontSize:11}}>{etb(receipt.amountEtb)} ETB</b></div>}
    {receipt.exchangeRate>0&&<div><small style={{display:"block",fontSize:9,color:"#64748b",fontWeight:800}}>EXCHANGE RATE</small><b style={{fontSize:11}}>1 USD = {etb(receipt.exchangeRate)} ETB</b></div>}
    <div><small style={{display:"block",fontSize:9,color:"#64748b",fontWeight:800}}>WALLET CREDIT</small><b style={{fontSize:11}}>{receipt.walletCredit.toLocaleString("en-US")} credits</b></div>
    {receipt.balanceAfter!==null&&<div><small style={{display:"block",fontSize:9,color:"#64748b",fontWeight:800}}>NEW BALANCE</small><b style={{fontSize:11}}>{receipt.balanceAfter.toLocaleString("en-US")} credits</b></div>}
   </div>
  </div>
  <div style={{padding:"12px 0",borderTop:"1px dashed #94a3b8",borderBottom:"1px dashed #94a3b8",textAlign:"center"}}>
   <div style={{maxWidth:300,margin:"0 auto"}}><Barcode value={receipt.receiptId}/></div>
   <b style={{display:"block",fontSize:11,letterSpacing:1.2}}>{receipt.receiptId}</b>
   <small style={{display:"block",fontFamily:"Arial,Helvetica,sans-serif",fontSize:9,color:"#64748b",marginTop:5}}>Verify at numelixa.com/receipt/verify</small>
   <a style={{fontFamily:"Arial,Helvetica,sans-serif",fontSize:10,color:"#1d4ed8"}} href={"/receipt/verify?code="+encodeURIComponent(receipt.receiptId)}>Open verification record</a>
  </div>
  <div style={{textAlign:"center",padding:"12px 0 5px"}}>
   <img src="/brand/numelixa-official-branding.jpg" alt="Official Numelixa seal and signature" style={{display:"block",width:190,maxWidth:"90%",height:"auto",margin:"0 auto"}}/>
   <div style={{fontFamily:"Arial,Helvetica,sans-serif",fontSize:10,color:"#475569",lineHeight:1.6}}>{receipt.verification}<br/>Official Numelixa receipt · Keep for your records</div>
  </div>
  <div className="nx-receipt-actions" style={{display:"flex",flexWrap:"wrap",gap:8,justifyContent:"center",paddingTop:12}}>
   <button type="button" onClick={()=>window.print()} style={{border:"1px solid #cbd5e1",background:"#f8fafc",color:"#0f172a",padding:"10px 12px",fontWeight:800}}>Print / Save PDF</button>
   <button type="button" onClick={share} style={{border:"1px solid #cbd5e1",background:"#f8fafc",color:"#0f172a",padding:"10px 12px",fontWeight:800}}>Share receipt</button>
   <button type="button" disabled={emailBusy} onClick={emailReceipt} style={{border:0,background:"#123b72",color:"#fff",padding:"10px 12px",fontWeight:800}}>{emailBusy?"Sending…":"Email receipt"}</button>
  </div>
  {message&&<p className="nx-receipt-message" role="status" style={{fontFamily:"Arial,Helvetica,sans-serif",fontSize:12,color:"#334155"}}>{message}</p>}
  <button className="nx-receipt-continue" type="button" onClick={onContinue} style={{display:"block",width:"100%",marginTop:12,padding:13,border:0,background:"#0f2e59",color:"#fff",fontWeight:900}}>Continue to wallet →</button>
  <footer style={{textAlign:"center",fontSize:9,color:"#64748b",paddingTop:12}}>receipts@numelixa.com · numelixa.com</footer>
 </section>;}
