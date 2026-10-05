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
function Section({id,title,children}:{id:string;title:string;children:ReactNode}){return <section id={id} style={{scrollMarginTop:30,marginTop:42}}><h2 style={{fontSize:25,letterSpacing:-.7}}>{title}</h2>{children}</section>}

export default function Docs(){
 return <main className="numelixa-docs-page" style={{maxWidth:1120,margin:"0 auto",padding:"24px 18px 80px",color:"#eafff9",lineHeight:1.7}}>
  <a href="https://numelixa.com" className="docs-back-home" aria-label="Back to Numelixa" title="Back to Numelixa">←</a>
  <div style={{fontSize:11,letterSpacing:3,color:"#72dfce",fontWeight:900}}>NUMELIXA DEVELOPER PLATFORM</div>
  <h1 style={{fontSize:44,letterSpacing:-2.5,margin:"8px 0"}}>API Documentation</h1>
  <p style={{color:"#86a8a9",maxWidth:850,fontSize:15}}>Production REST API at https://numelixa.com/api/v1 for virtual-number applications. Discover live inventory, exact selling prices, purchase activations from the authenticated user's wallet, retrieve SMS and manage orders.</p>
  <div style={{display:"flex",gap:8,flexWrap:"wrap",margin:"20px 0"}}>{["REST / JSON","API v1","Live stock","Wallet billing","cURL","JavaScript","Python","PHP","Go"].map(x=><span key={x} style={{padding:"6px 10px",borderRadius:999,background:"rgba(114,223,206,.07)",border:"1px solid rgba(114,223,206,.14)",fontSize:11,color:"#8ad8ce"}}>{x}</span>)}</div>

  <div style={{padding:18,borderRadius:18,background:"rgba(5,39,47,.75)",border:"1px solid rgba(121,246,229,.14)"}}>
   <b>Base URL</b><Code>{base}</Code>
   <b>Authentication</b><Code>{"Authorization: Bearer NX_API_KEY"}</Code>
   <p style={{marginBottom:0,color:"#7e9e9f",fontSize:12}}>Every account receives an API key automatically. The secret must stay on your backend.</p>
  </div>

  <Section id="quickstart" title="Quick start">
   <p>Authenticate → check balance → check live stock → compare price → order → poll SMS → complete or cancel.</p>
   <Code>{'curl "https://numelixa.com/api/v1/account" -H "Authorization: Bearer NX_API_KEY"'}</Code>
   <Code>{'curl "https://numelixa.com/api/v1/stock?country=usa&service=whatsapp&operator=any" -H "Authorization: Bearer NX_API_KEY"'}</Code>
   <Code>{'curl -X POST "https://numelixa.com/api/v1/orders" \\\n  -H "Authorization: Bearer NX_API_KEY" \\\n  -H "Content-Type: application/json" \\\n  -d \'{"country":"usa","service":"whatsapp","operator":"any"}\''}</Code>
  </Section>

  <Section id="auth" title="Authentication">
   <p>Send the API key with a Bearer token. <code>x-api-key</code> is also accepted.</p>
   <Code>{"Authorization: Bearer nx_live_YOUR_SECRET_KEY"}</Code>
   <Code>{"x-api-key: nx_live_YOUR_SECRET_KEY"}</Code>
   <p style={{color:"#9bc0c0",fontSize:12}}>Never expose a production key in browser JavaScript, mobile client source or public repositories. Store it as a server environment variable such as NUMELIXA_API_KEY.</p>
  </Section>

  <Section id="account" title="1. Account & wallet">
   <p><b>GET /account</b> returns the current authenticated wallet balance.</p>
   <Code>{'curl "https://numelixa.com/api/v1/account" -H "Authorization: Bearer NX_API_KEY"'}</Code>
   <Code>{'{\n  "ok": true,\n  "account": {\n    "id": "USER_ID",\n    "email": "user@example.com",\n    "name": "Example User",\n    "verified": true,\n    "balance": 850,\n    "currency": "coins"\n  }\n}'}</Code>
   <p><b>GET /transactions</b> returns the latest wallet ledger entries.</p>
   <Code>{'curl "https://numelixa.com/api/v1/transactions" -H "Authorization: Bearer NX_API_KEY"'}</Code>
  </Section>

  <Section id="services" title="2. Services">
   <p><b>GET /services</b> returns available Numelixa services.</p>
   <Code>{'curl "https://numelixa.com/api/v1/services" -H "Authorization: Bearer NX_API_KEY"'}</Code>
  </Section>

  <Section id="countries" title="3. Countries & prices">
   <p><b>GET /countries?service=whatsapp</b> returns countries, live stock and Numelixa selling price.</p>
   <Code>{'curl "https://numelixa.com/api/v1/countries?service=whatsapp" -H "Authorization: Bearer NX_API_KEY"'}</Code>
   <p>The <code>price</code> field is the amount charged from the wallet. <code>providerCostUsd</code> is informational only.</p>
  </Section>

  <Section id="stock" title="4. Live stock">
   <p><b>GET /stock</b> checks one exact country/service/operator combination.</p>
   <Code>{'curl "https://numelixa.com/api/v1/stock?country=usa&service=whatsapp&operator=any" -H "Authorization: Bearer NX_API_KEY"'}</Code>
   <Code>{'{\n  "ok": true,\n  "stock": {\n    "available": true,\n    "count": 12,\n    "country": "usa",\n    "service": "whatsapp",\n    "operator": "any",\n    "price": 85,\n    "providerCostUsd": 0.65,\n    "currency": "USD"\n  }\n}'}</Code>
   <p style={{color:"#9bc0c0",fontSize:12}}>Always use the live price. Stock and price can change between requests.</p>
  </Section>

  <Section id="purchase" title="5. Purchase a number">
   <p><b>POST /orders</b> purchases a real activation using the authenticated user's Numelixa wallet.</p><p><b>Request fields:</b> <code>country</code> is the Numelixa country ID (for example <code>usa</code>), <code>service</code> is the Numelixa service ID (for example <code>whatsapp</code>), and <code>operator</code> is optional. The API validates these values before attempting a purchase.</p>
   <Code>{'curl -X POST "https://numelixa.com/api/v1/orders" \\\n  -H "Authorization: Bearer NX_API_KEY" \\\n  -H "Content-Type: application/json" \\\n  -d \'{"country":"usa","service":"whatsapp","operator":"any"}\''}</Code>
   <ul><li><code>country</code> — required Numelixa country code.</li><li><code>service</code> — required Numelixa service ID.</li><li><code>operator</code> — optional; use <code>any</code> to let the number network choose.</li></ul>
   <Code>{'{\n  "ok": true,\n  "order": {\n    "id": "ORDER_ID",\n    "number": "+15551234567",\n    "price": 85,\n    "providerCost": 0.65,\n    "operator": "any",\n    "expiresIn": 600,\n    "stockAfter": 11\n  }\n}'}</Code>
   <p>Numelixa checks the live Numelixa quote immediately before charging the wallet. Insufficient balance returns HTTP 402. Provider/stock conflicts are returned without silently creating a fake order.</p>
  </Section>

  <Section id="orders" title="6. Orders">
   <p><b>GET /orders</b> lists the authenticated user's recent orders.</p>
   <Code>{'curl "https://numelixa.com/api/v1/orders" -H "Authorization: Bearer NX_API_KEY"'}</Code>
   <p><b>GET /orders/:id</b> returns one order with phone, status, expiry and SMS information.</p>
   <Code>{'curl "https://numelixa.com/api/v1/orders/ORDER_ID" -H "Authorization: Bearer NX_API_KEY"'}</Code>
   <p>Orders are always scoped to the API key's own account.</p>
  </Section>

  <Section id="sms" title="7. Retrieve SMS / verification code">
   <p><b>POST /orders/code</b> requests the latest SMS/code for an activation.</p>
   <Code>{'curl -X POST "https://numelixa.com/api/v1/orders/code" \\\n  -H "Authorization: Bearer NX_API_KEY" \\\n  -H "Content-Type: application/json" \\\n  -d \'{"orderId":"ORDER_ID"}\''}</Code>
   <p>Poll with reasonable intervals and backoff. Do not continuously hammer the API.</p>
  </Section>

  <Section id="cancel" title="8. Cancel & refund">
   <p><b>POST /orders/cancel</b> cancels a waiting activation when allowed and refunds its Numelixa wallet cost.</p>
   <Code>{'curl -X POST "https://numelixa.com/api/v1/orders/cancel" \\\n  -H "Authorization: Bearer NX_API_KEY" \\\n  -H "Content-Type: application/json" \\\n  -d \'{"orderId":"ORDER_ID"}\''}</Code>
   <Code>{'{\n  "ok": true,\n  "status": "cancelled",\n  "refundedCoins": 85\n}'}</Code>
  </Section>

  <Section id="javascript" title="9. JavaScript / Node.js">
   <Code>{'const API = "https://numelixa.com/api/v1";\nconst KEY = process.env.NUMELIXA_API_KEY;\n\nasync function api(path, options = {}) {\n  const res = await fetch(API + path, {\n    ...options,\n    headers: { Authorization: "Bearer " + KEY, "Content-Type": "application/json", ...(options.headers || {}) }\n  });\n  const data = await res.json();\n  if (!res.ok) throw new Error(data.error || "Numelixa API error");\n  return data;\n}\n\nconst balance = await api("/account");\nconst stock = await api("/stock?country=usa&service=whatsapp&operator=any");\nif (!stock.stock.available) throw new Error("Out of stock");\nif (stock.stock.price > balance.account.balance) throw new Error("Insufficient balance");\n\nconst order = await api("/orders", { method: "POST", body: JSON.stringify({ country:"usa", service:"whatsapp", operator:"any" }) });\nconsole.log(order.order.number, order.order.id);'}</Code>
  </Section>

  <Section id="python" title="10. Python">
   <Code>{'import os\nimport requests\n\nAPI = "https://numelixa.com/api/v1"\nHEADERS = {"Authorization": "Bearer " + os.environ["NUMELIXA_API_KEY"], "Content-Type": "application/json"}\n\ndef api(method, path, **kwargs):\n    r = requests.request(method, API + path, headers=HEADERS, **kwargs)\n    data = r.json()\n    if not r.ok: raise RuntimeError(data.get("error", "Numelixa API error"))\n    return data\n\nbalance = api("GET", "/account")\nstock = api("GET", "/stock?country=usa&service=whatsapp&operator=any")\nif not stock["stock"]["available"]: raise RuntimeError("Out of stock")\nif stock["stock"]["price"] > balance["account"]["balance"]: raise RuntimeError("Insufficient balance")\norder = api("POST", "/orders", json={"country":"usa","service":"whatsapp","operator":"any"})\nprint(order["order"]["number"], order["order"]["id"])'}</Code>
  </Section>

  <Section id="php" title="11. PHP">
   <Code>{'<?php\n$api = "https://numelixa.com/api/v1";\n$key = getenv("NUMELIXA_API_KEY");\n\nfunction nx($method, $path, $body = null) {\n  global $api, $key;\n  $ch = curl_init($api . $path);\n  curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER=>true, CURLOPT_CUSTOMREQUEST=>$method, CURLOPT_HTTPHEADER=>["Authorization: Bearer ".$key,"Content-Type: application/json"]]);\n  if ($body !== null) curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($body));\n  $raw = curl_exec($ch); $status = curl_getinfo($ch, CURLINFO_HTTP_CODE); curl_close($ch);\n  $data = json_decode($raw, true);\n  if ($status >= 400) throw new Exception($data["error"] ?? "Numelixa API error");\n  return $data;\n}\n\n$balance = nx("GET", "/account");\n$stock = nx("GET", "/stock?country=usa&service=whatsapp&operator=any");\nif (!$stock["stock"]["available"]) die("Out of stock");\nif ($stock["stock"]["price"] > $balance["account"]["balance"]) die("Insufficient balance");\n$order = nx("POST", "/orders", ["country"=>"usa","service"=>"whatsapp","operator"=>"any"]);\nprint_r($order);'}</Code>
  </Section>

  <Section id="errors" title="12. Errors & HTTP status">
   <div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}><tbody>{[["200","Success"],["400","Invalid or missing request parameters"],["401","Missing or invalid API key"],["402","Insufficient Numelixa wallet balance"],["404","Order/resource not found"],["409","Out of stock, price changed, provider conflict or invalid order state"],["502","Provider/API failure"],["503","Temporary provider/service unavailable"]].map(([a,b])=><tr key={a}><td style={{padding:10,borderBottom:"1px solid rgba(255,255,255,.06)",fontFamily:"monospace"}}>{a}</td><td style={{padding:10,borderBottom:"1px solid rgba(255,255,255,.06)"}}>{b}</td></tr>)}</tbody></table></div>
  </Section>

  <Section id="go" title="13. Go"> <Code>{'package main\nimport ("bytes"; "encoding/json"; "fmt"; "net/http"; "os")\nfunc main(){b,_:=json.Marshal(map[string]string{"country":"usa","service":"whatsapp","operator":"any"});r,_:=http.NewRequest("POST","https://numelixa.com/api/v1/orders",bytes.NewReader(b));r.Header.Set("Authorization","Bearer "+os.Getenv("NUMELIXA_API_KEY"));r.Header.Set("Content-Type","application/json");res,_:=http.DefaultClient.Do(r);defer res.Body.Close();fmt.Println(res.Status)}'}</Code></Section>

  <Section id="security" title="14. Security & production rules">
   <ul><li>Keep NUMELIXA_API_KEY on your server only.</li><li>Never commit the key to GitHub or expose it in browser/mobile source.</li><li>Check live stock and price immediately before ordering.</li><li>Use the returned order ID to retrieve the correct activation.</li><li>Use reasonable SMS polling intervals.</li><li>If compromised, use <b>Revoke & Replace</b>; the old key becomes invalid and a fresh key is automatically issued.</li></ul>
  </Section>

  <div style={{marginTop:50,padding:20,borderRadius:18,background:"rgba(114,223,206,.05)",border:"1px solid rgba(114,223,206,.12)"}}><b>Numelixa API contract.</b><p style={{color:"#78999a",marginBottom:0}}>Every API purchase is charged from the authenticated Numelixa user's wallet. Public API responses and documentation never expose internal upstream provider identity or raw upstream errors.</p></div>
 </main>
}
