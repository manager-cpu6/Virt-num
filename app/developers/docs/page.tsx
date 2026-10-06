"use client";
import {useState} from "react";
import type {ReactNode} from "react";

const base="https://numelixa.com/api/v1";

function Code({children}:{children:string}){
 const[done,setDone]=useState(false);
 return <div style={{position:"relative",margin:"10px 0 24px"}}>
  <pre style={{overflowX:"auto",whiteSpace:"pre-wrap",wordBreak:"break-word",padding:"18px 55px 18px 16px",borderRadius:15,background:"#01191f",border:"1px solid rgba(121,246,229,.1)",color:"#c9eeea",fontSize:12,lineHeight:1.65}}>{children}</pre>
  <button onClick={async()=>{try{await navigator.clipboard.writeText(children);setDone(true);setTimeout(()=>setDone(false),1500)}catch{}}} style={{position:"absolute",right:10,top:10,border:"1px solid rgba(121,246,229,.2)",background:"rgba(114,223,206,.08)",color:"#72dfce",borderRadius:9,padding:"7px 9px",fontSize:11,fontWeight:900}}>{done?"Copied":"Copy"}</button>
 </div>
}
function Section({id,title,children}:{id:string;title:string;children:ReactNode}){
 return <section id={id} style={{scrollMarginTop:30,marginTop:42}}><h2 style={{fontSize:25,letterSpacing:-.7}}>{title}</h2>{children}</section>
}

export default function Docs(){
 return <main className="numelixa-docs-page" style={{maxWidth:1120,margin:"0 auto",padding:"24px 18px 80px",color:"#eafff9",lineHeight:1.7}}>
  <a href="https://numelixa.com" className="docs-back-home" aria-label="Back to Numelixa" title="Back to Numelixa">←</a>
  <div style={{fontSize:11,letterSpacing:3,color:"#72dfce",fontWeight:900}}>NUMELIXA DEVELOPER PLATFORM</div>
  <h1 style={{fontSize:44,letterSpacing:-2.5,margin:"8px 0"}}>API Documentation</h1>
  <p style={{color:"#86a8a9",maxWidth:850,fontSize:15}}>Production REST API for virtual-number applications. Check live inventory, read Numelixa prices, purchase activations, retrieve SMS codes, cancel eligible orders and manage wallet data.</p>

  <div style={{display:"flex",gap:8,flexWrap:"wrap",margin:"20px 0"}}>{["REST / JSON","API v1","Live stock","Wallet billing","cURL","JavaScript","Python","PHP","Go"].map(x=><span key={x} style={{padding:"6px 10px",borderRadius:999,background:"rgba(114,223,206,.07)",border:"1px solid rgba(114,223,206,.14)",fontSize:11,color:"#8ad8ce"}}>{x}</span>)}</div>

  <div style={{padding:18,borderRadius:18,background:"rgba(5,39,47,.75)",border:"1px solid rgba(121,246,229,.14)"}}>
   <b>Base URL</b><Code>{base}</Code>
   <b>Authentication</b><Code>{"Authorization: Bearer nx_live_YOUR_SECRET_KEY"}</Code>
   <p style={{marginBottom:0,color:"#7e9e9f",fontSize:12}}>API keys are account secrets. Keep them on your backend only.</p>
  </div>

  <Section id="quickstart" title="Quick start">
   <p>Authenticate → check balance → check live stock → purchase → save the order ID → poll SMS → cancel when eligible.</p>
   <Code>{'curl "https://numelixa.com/api/v1/account" -H "Authorization: Bearer nx_live_YOUR_SECRET_KEY"'}</Code>
   <Code>{'curl "https://numelixa.com/api/v1/stock?country=usa&service=whatsapp" -H "Authorization: Bearer nx_live_YOUR_SECRET_KEY"'}</Code>
   <Code>{'curl -X POST "https://numelixa.com/api/v1/orders" \\\n  -H "Authorization: Bearer nx_live_YOUR_SECRET_KEY" \\\n  -H "Content-Type: application/json" \\\n  -d \'{"country":"usa","service":"whatsapp"}\''}</Code>
  </Section>

  <Section id="account" title="1. Account & wallet">
   <p><b>GET /account</b> returns the authenticated account and current wallet balance.</p>
   <Code>{'curl "https://numelixa.com/api/v1/account" -H "Authorization: Bearer nx_live_YOUR_SECRET_KEY"'}</Code>
   <p><b>GET /balance</b> returns only the current balance.</p>
   <p><b>GET /transactions</b> returns recent wallet ledger entries.</p>
  </Section>

  <Section id="services" title="2. Services">
   <p><b>GET /services</b> returns the service identifiers currently available to the account.</p>
   <Code>{'curl "https://numelixa.com/api/v1/services" -H "Authorization: Bearer nx_live_YOUR_SECRET_KEY"'}</Code>
  </Section>

  <Section id="countries" title="3. Countries & prices">
   <p><b>GET /countries?service=whatsapp</b> returns countries, live availability and the Numelixa selling price.</p>
   <Code>{'curl "https://numelixa.com/api/v1/countries?service=whatsapp" -H "Authorization: Bearer nx_live_YOUR_SECRET_KEY"'}</Code>
   <p>Country results expose Numelixa identifiers, display information, current stock and wallet price. Internal network/provider routing is deliberately not part of the public contract.</p>
  </Section>

  <Section id="stock" title="4. Live stock">
   <p><b>GET /stock?country=usa&service=whatsapp</b> checks the current availability and selling price.</p>
   <Code>{'curl "https://numelixa.com/api/v1/stock?country=usa&service=whatsapp" -H "Authorization: Bearer nx_live_YOUR_SECRET_KEY"'}</Code>
   <Code>{'{
  "ok": true,
  "stock": {
    "available": true,
    "count": 12,
    "country": "usa",
    "service": "whatsapp",
    "price": 85,
    "currency": "USD"
  }
}'}</Code>
   <p style={{color:"#9bc0c0",fontSize:12}}>Stock and price can change quickly. Refresh before purchasing.</p>
  </Section>

  <Section id="purchase" title="5. Purchase a number">
   <p><b>POST /orders</b> purchases an activation using the authenticated wallet.</p>
   <Code>{'curl -X POST "https://numelixa.com/api/v1/orders" \\\n  -H "Authorization: Bearer nx_live_YOUR_SECRET_KEY" \\\n  -H "Content-Type: application/json" \\\n  -d \'{"country":"usa","service":"whatsapp"}\''}</Code>
   <p>Only <code>country</code> and <code>service</code> are public purchase inputs. Numelixa automatically handles the underlying number-network selection.</p>
   <Code>{'{
  "ok": true,
  "order": {
    "id": "ORDER_ID",
    "number": "+15551234567",
    "price": 85,
    "expiresIn": 600,
    "stockAfter": 11
  }
}'}</Code>
   <p>The server checks live availability immediately before charging. If a purchase cannot be completed safely, the wallet debit is reversed when the activation is successfully cancelled.</p>
  </Section>

  <Section id="orders" title="6. Orders">
   <p><b>GET /orders</b> lists the authenticated account's orders. Use <code>limit</code> (1–100) and optional <code>status</code> filters.</p>
   <Code>{'curl "https://numelixa.com/api/v1/orders?limit=25&status=waiting" -H "Authorization: Bearer nx_live_YOUR_SECRET_KEY"'}</Code>
   <p><b>GET /orders/:id</b> returns one order with its number, service, country, price, status, SMS information and expiry.</p>
   <Code>{'curl "https://numelixa.com/api/v1/orders/ORDER_ID" -H "Authorization: Bearer nx_live_YOUR_SECRET_KEY"'}</Code>
  </Section>

  <Section id="sms" title="7. Retrieve SMS / verification code">
   <p><b>POST /orders/code</b> checks an activation for its latest SMS/code.</p>
   <Code>{'curl -X POST "https://numelixa.com/api/v1/orders/code" \\\n  -H "Authorization: Bearer nx_live_YOUR_SECRET_KEY" \\\n  -H "Content-Type: application/json" \\\n  -d \'{"orderId":"ORDER_ID"}\''}</Code>
   <p>Use a short, reasonable polling interval with backoff. Stop when the order is completed, cancelled or expired.</p>
  </Section>

  <Section id="cancel" title="8. Cancel & refund">
   <p><b>POST /orders/cancel</b> cancels an eligible waiting activation and refunds the Numelixa wallet amount.</p>
   <Code>{'curl -X POST "https://numelixa.com/api/v1/orders/cancel" \\\n  -H "Authorization: Bearer nx_live_YOUR_SECRET_KEY" \\\n  -H "Content-Type: application/json" \\\n  -d \'{"orderId":"ORDER_ID"}\''}</Code>
   <Code>{'{
  "ok": true,
  "status": "cancelled",
  "refundedCoins": 85
}'}</Code>
  </Section>

  <Section id="javascript" title="9. JavaScript / Node.js">
   <Code>{'const API = "https://numelixa.com/api/v1";\nconst KEY = process.env.NUMELIXA_API_KEY;\n\nasync function api(path, options = {}) {\n  const res = await fetch(API + path, {\n    ...options,\n    headers: { Authorization: "Bearer " + KEY, "Content-Type": "application/json", ...(options.headers || {}) }\n  });\n  const data = await res.json();\n  if (!res.ok) throw new Error(data.error || "Numelixa API error");\n  return data;\n}\n\nconst account = await api("/account");\nconst stock = await api("/stock?country=usa&service=whatsapp");\nif (!stock.stock.available) throw new Error("Out of stock");\nif (stock.stock.price > account.account.balance) throw new Error("Insufficient balance");\nconst order = await api("/orders", { method: "POST", body: JSON.stringify({ country:"usa", service:"whatsapp" }) });\nconsole.log(order.order.id, order.order.number);'}</Code>
  </Section>

  <Section id="python" title="10. Python">
   <Code>{'import os\nimport requests\n\nAPI = "https://numelixa.com/api/v1"\nHEADERS = {"Authorization": "Bearer " + os.environ["NUMELIXA_API_KEY"], "Content-Type": "application/json"}\n\ndef api(method, path, **kwargs):\n    r = requests.request(method, API + path, headers=HEADERS, timeout=15, **kwargs)\n    data = r.json()\n    if not r.ok: raise RuntimeError(data.get("error", "Numelixa API error"))\n    return data\n\naccount = api("GET", "/account")\nstock = api("GET", "/stock?country=usa&service=whatsapp")\nif not stock["stock"]["available"]: raise RuntimeError("Out of stock")\nif stock["stock"]["price"] > account["account"]["balance"]: raise RuntimeError("Insufficient balance")\norder = api("POST", "/orders", json={"country":"usa","service":"whatsapp"})\nprint(order["order"]["id"], order["order"]["number"])'}</Code>
  </Section>

  <Section id="errors" title="11. Errors & HTTP status">
   <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}><tbody>{[["200","Success"],["400","Invalid or missing parameters"],["401","Missing or invalid API key"],["402","Insufficient wallet balance"],["403","Email verification required"],["404","Order/resource not found"],["409","Stock, price or order-state conflict"],["502","Temporary number-service failure"],["503","Number service temporarily unavailable"]].map(([a,b])=><tr key={a}><td style={{padding:10,borderBottom:"1px solid rgba(255,255,255,.06)",fontFamily:"monospace"}}>{a}</td><td style={{padding:10,borderBottom:"1px solid rgba(255,255,255,.06)"}}>{b}</td></tr>)}</tbody></table></div>
   <Code>{'{
  "ok": false,
  "error": "Human-readable error message"
}'}</Code>
  </Section>

  <Section id="production" title="12. Production integration rules">
   <ul>
    <li>Keep the API key on your server only.</li>
    <li>Refresh stock immediately before purchase.</li>
    <li>Save the returned order ID immediately.</li>
    <li>Never blindly retry a timed-out purchase; first check the order list/status.</li>
    <li>Poll SMS with backoff and stop after completion, cancellation or expiry.</li>
    <li>Handle 409 by refreshing stock/order state before retrying.</li>
    <li>Use cancellation only for eligible waiting orders.</li>
    <li>Never depend on undocumented fields.</li>
   </ul>
  </Section>

  <div style={{marginTop:50,padding:20,borderRadius:18,background:"rgba(114,223,206,.05)",border:"1px solid rgba(114,223,206,.12)"}}>
   <b>Public API contract</b>
   <p style={{color:"#78999a",marginBottom:0}}>Numelixa intentionally hides internal number-network identity, credentials, routing choices and upstream implementation details. Developers receive only the stable Numelixa API contract.</p>
  </div>
 </main>
}
