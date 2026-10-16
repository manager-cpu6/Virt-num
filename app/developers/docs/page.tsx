"use client";

import {useState} from "react";

const BASE="https://numelixa.com/api/v1";
const KEY="$NUMELIXA_API_KEY";

const samples:Record<string,string>={
 "cURL":`# 1. Check your account
curl --fail-with-body -sS "${BASE}/account" \\
  -H "Authorization: Bearer ${KEY}" \\
  -H "Accept: application/json"

# 2. Check WhatsApp stock in the USA
curl --fail-with-body -sS "${BASE}/stock?country=usa&service=whatsapp" \\
  -H "Authorization: Bearer ${KEY}" \\
  -H "Accept: application/json"

# 3. Purchase a number (creates an order)
curl --fail-with-body -sS -X POST "${BASE}/orders" \\
  -H "Authorization: Bearer ${KEY}" \\
  -H "Accept: application/json" \\
  -H "Content-Type: application/json" \\
  --data '{"country":"usa","service":"whatsapp"}'`,
 Python:`import os
import requests

BASE = "${BASE}"
KEY = os.environ["NUMELIXA_API_KEY"]
session = requests.Session()
session.headers.update({
    "Authorization": f"Bearer {KEY}",
    "Accept": "application/json",
    "Content-Type": "application/json",
})

def api(method, path, **kwargs):
    # Do not follow redirects: an API request should return JSON directly.
    response = session.request(
        method, BASE + path, timeout=20, allow_redirects=False, **kwargs
    )
    if 300 <= response.status_code < 400:
        raise RuntimeError("Unexpected redirect from API: " + response.headers.get("Location", ""))
    try:
        data = response.json()
    except ValueError as exc:
        raise RuntimeError(f"API returned non-JSON (HTTP {response.status_code})") from exc
    if not response.ok or data.get("ok") is False:
        raise RuntimeError(f"HTTP {response.status_code}: {data.get('error', 'API request failed')}")
    return data

account = api("GET", "/account")
print("Account:", account)
stock = api("GET", "/stock?country=usa&service=whatsapp")
print("Stock:", stock)
order = api("POST", "/orders", json={"country": "usa", "service": "whatsapp"})
print("Order:", order)`,
 JavaScript:`const BASE = "${BASE}";
const KEY = process.env.NUMELIXA_API_KEY;

async function api(path, options = {}) {
  const response = await fetch(BASE + path, {
    ...options,
    redirect: "manual",
    headers: {
      Authorization: "Bearer " + KEY,
      Accept: "application/json",
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  if (response.status >= 300 && response.status < 400) {
    throw new Error("Unexpected API redirect; check the API URL.");
  }
  const data = await response.json();
  if (!response.ok || data.ok === false) {
    throw new Error(data.error || "HTTP " + response.status);
  }
  return data;
}

console.log(await api("/account"));
console.log(await api("/stock?country=usa&service=whatsapp"));
console.log(await api("/orders", {
  method: "POST",
  body: JSON.stringify({ country: "usa", service: "whatsapp" }),
}));`,
 PHP:`<?php
$base = "${BASE}";
$key = getenv("NUMELIXA_API_KEY");

function numelixa($method, $path, $payload = null) {
  global $base, $key;
  $ch = curl_init($base . $path);
  $headers = [
    "Authorization: Bearer " . $key,
    "Accept: application/json",
    "Content-Type: application/json"
  ];
  curl_setopt_array($ch, [
    CURLOPT_RETURNTRANSFER => true,
    CURLOPT_FOLLOWLOCATION => false,
    CURLOPT_CUSTOMREQUEST => $method,
    CURLOPT_HTTPHEADER => $headers,
    CURLOPT_TIMEOUT => 20
  ]);
  if ($payload !== null) curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
  $body = curl_exec($ch);
  $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
  if ($body === false) throw new RuntimeException(curl_error($ch));
  curl_close($ch);
  if ($status >= 300 && $status < 400) throw new RuntimeException("Unexpected API redirect");
  $data = json_decode($body, true);
  if ($status < 200 || $status >= 300 || !is_array($data) || (($data["ok"] ?? true) === false))
    throw new RuntimeException($data["error"] ?? "Numelixa API request failed");
  return $data;
}

print_r(numelixa("GET", "/account"));
print_r(numelixa("GET", "/stock?country=usa&service=whatsapp"));
print_r(numelixa("POST", "/orders", ["country" => "usa", "service" => "whatsapp"]));`
};

const sections=[
 {id:"overview",title:"Overview",desc:"Start here: API base URL, authentication and JSON response rules."},
 {id:"account",title:"Account & balance",desc:"Read your API account, wallet balance and transactions."},
 {id:"inventory",title:"Services, countries & stock",desc:"Find supported services and check available inventory before buying."},
 {id:"orders",title:"Orders",desc:"Purchase a number, save the order ID, retrieve the SMS code and cancel eligible orders."},
 {id:"webhooks",title:"Webhooks",desc:"Receive order and SMS events on your server instead of polling the API repeatedly."},
 {id:"errors",title:"Errors & reliability",desc:"Handle HTTP statuses, timeouts, retries and idempotency safely."},
 {id:"examples",title:"Code examples",desc:"Copy complete examples for cURL, Python, JavaScript/Node.js and PHP."}
];

function Code({value}:{value:string}){
 const [copied,setCopied]=useState(false);
 return <div style={{position:"relative",margin:"12px 0 24px"}}>
  <pre style={{overflowX:"auto",whiteSpace:"pre-wrap",wordBreak:"break-word",padding:"18px 62px 18px 16px",borderRadius:14,background:"#03141d",border:"1px solid rgba(109,222,230,.16)",color:"#d9f5f4",fontSize:12,lineHeight:1.7}}>{value}</pre>
  <button onClick={async()=>{try{await navigator.clipboard.writeText(value);setCopied(true);window.setTimeout(()=>setCopied(false),1300)}catch{}}} style={{position:"absolute",right:9,top:9,border:"1px solid rgba(109,222,230,.22)",background:"#0c2934",color:"#7be5d8",borderRadius:8,padding:"7px 10px",fontSize:11,fontWeight:800}}>{copied?"Copied":"Copy"}</button>
 </div>
}

export default function Docs(){
 const [language,setLanguage]=useState("Python");
 const [section,setSection]=useState("overview");
 const [endpoint,setEndpoint]=useState("GET /account");
 const [showWebhook,setShowWebhook]=useState(false);
 const panel={padding:22,borderRadius:20,border:"1px solid rgba(109,222,230,.14)",background:"rgba(5,28,39,.78)",marginBottom:18} as const;
 return <main style={{maxWidth:1240,margin:"0 auto",padding:"24px 18px 90px",color:"#edf9ff",fontFamily:"Inter,system-ui,sans-serif",lineHeight:1.7}}>
  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",gap:12,flexWrap:"wrap"}}><a href="https://numelixa.com" style={{color:"#7be5d8",textDecoration:"none",fontWeight:800}}>← Numelixa</a><a href="https://support.numelixa.com" style={{color:"#a8c0ce",textDecoration:"none",fontSize:13}}>Developer support ↗</a></div>
  <div style={{display:"grid",gridTemplateColumns:"minmax(0,1fr)",gap:18,marginTop:30}}>
   <section style={{padding:"28px 24px",borderRadius:26,border:"1px solid rgba(109,222,230,.2)",background:"radial-gradient(ellipse at 10% 0%,rgba(21,111,137,.35),transparent 55%),linear-gradient(145deg,#071b2b,#04121e)"}}>
    <div style={{fontSize:11,letterSpacing:3,color:"#7be5d8",fontWeight:900}}>NUMELIXA DEVELOPERS · REST API V1</div>
    <h1 style={{fontSize:"clamp(32px,5vw,48px)",letterSpacing:-1.8,lineHeight:1.1,margin:"12px 0"}}>Build with Numelixa</h1>
    <p style={{maxWidth:760,color:"#a8c0ce",fontSize:16}}>A practical reference for virtual-number workflows. Each topic has its own section, examples are separated by language, and API-key requests are designed to receive JSON—not browser login pages.</p>
    <div style={{display:"flex",gap:10,flexWrap:"wrap",marginTop:20}}><span style={{padding:"7px 10px",borderRadius:9,background:"#0d2a37",color:"#9cece3",fontSize:12}}>REST · JSON</span><span style={{padding:"7px 10px",borderRadius:9,background:"#0d2a37",color:"#9cece3",fontSize:12}}>Bearer API key</span><span style={{padding:"7px 10px",borderRadius:9,background:"#0d2a37",color:"#9cece3",fontSize:12}}>Webhook-ready</span></div>
   </section>
   <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(230px,1fr))",gap:10}}>{sections.map((s,i)=><button key={s.id} onClick={()=>{setSection(s.id);document.getElementById(s.id)?.scrollIntoView({behavior:"smooth",block:"start"})}} style={{textAlign:"left",padding:15,borderRadius:14,border:"1px solid "+(section===s.id?"rgba(123,229,216,.5)":"rgba(109,222,230,.12)"),background:section===s.id?"rgba(20,91,104,.35)":"rgba(5,28,39,.65)",color:"#edf9ff",cursor:"pointer"}}><span style={{display:"block",color:"#7be5d8",fontSize:10,fontWeight:900,letterSpacing:1.5}}>0{i+1}</span><b>{s.title}</b><span style={{display:"block",fontSize:12,color:"#91acbc",lineHeight:1.5,marginTop:4}}>{s.desc}</span></button>)}</div>
   <section id="overview" style={panel}><h2 style={{marginTop:0}}>01 · Overview & authentication</h2><p style={{color:"#a8c0ce"}}>All requests target the API base URL. Send your key on every request. Keep it on a private server, never inside a public frontend or distributed APK.</p><p><b>Base URL</b><br/><code>{BASE}</code></p><p><b>Authentication header</b><br/><code>Authorization: Bearer YOUR_SECRET_API_KEY</code></p><p><b>Standard headers</b><br/><code>Accept: application/json</code><br/><code>Content-Type: application/json</code> for JSON request bodies.</p><div style={{padding:14,borderRadius:12,background:"rgba(255,194,94,.07)",border:"1px solid rgba(255,194,94,.2)",color:"#f4d8a3",fontSize:13}}>Do not add <code>-L</code> / automatic redirect following to API examples. A redirect can hide a wrong URL or an authentication problem; inspect 3xx responses instead.</div></section>
   <section id="account" style={panel}><h2 style={{marginTop:0}}>02 · Account & balance</h2><p style={{color:"#a8c0ce"}}>Verify that your key is active before starting an order. Use the balance and transaction endpoints to reconcile wallet changes.</p><Code value={`curl --fail-with-body -sS "${BASE}/account" \\\n  -H "Authorization: Bearer ${KEY}" \\\n  -H "Accept: application/json"`}/><Code value={`curl --fail-with-body -sS "${BASE}/balance" \\\n  -H "Authorization: Bearer ${KEY}" \\\n  -H "Accept: application/json"`}/></section>
   <section id="inventory" style={panel}><h2 style={{marginTop:0}}>03 · Services, countries & stock</h2><p style={{color:"#a8c0ce"}}>Discover the supported catalog first. Check stock and price immediately before purchasing because availability can change.</p><Code value={`curl --fail-with-body -sS "${BASE}/services" -H "Authorization: Bearer ${KEY}" -H "Accept: application/json"`}/><Code value={`curl --fail-with-body -sS "${BASE}/countries?service=whatsapp" -H "Authorization: Bearer ${KEY}" -H "Accept: application/json"`}/><Code value={`curl --fail-with-body -sS "${BASE}/stock?country=usa&service=whatsapp" -H "Authorization: Bearer ${KEY}" -H "Accept: application/json"`}/></section>
   <section id="orders" style={panel}><h2 style={{marginTop:0}}>04 · Orders lifecycle</h2><h3>Purchase a number</h3><Code value={`curl --fail-with-body -sS -X POST "${BASE}/orders" \\\n  -H "Authorization: Bearer ${KEY}" \\\n  -H "Accept: application/json" \\\n  -H "Content-Type: application/json" \\\n  --data '{"country":"usa","service":"whatsapp"}'`}/><h3>Retrieve an order</h3><Code value={`curl --fail-with-body -sS "${BASE}/orders/ORDER_ID" -H "Authorization: Bearer ${KEY}" -H "Accept: application/json"`}/><h3>Request SMS code</h3><Code value={`curl --fail-with-body -sS -X POST "${BASE}/orders/code" -H "Authorization: Bearer ${KEY}" -H "Content-Type: application/json" -H "Accept: application/json" --data '{"orderId":"ORDER_ID"}'`}/><h3>Cancel an eligible waiting order</h3><Code value={`curl --fail-with-body -sS -X POST "${BASE}/orders/cancel" -H "Authorization: Bearer ${KEY}" -H "Content-Type: application/json" -H "Accept: application/json" --data '{"orderId":"ORDER_ID"}'`}/><p style={{color:"#a8c0ce",fontSize:13}}>Save the returned order ID. If a purchase times out, check the order/account history before retrying so you do not accidentally create a second purchase.</p></section>
   <section id="webhooks" style={panel}><h2 style={{marginTop:0}}>05 · Webhooks (event-driven integration)</h2><p style={{color:"#a8c0ce"}}>A webhook lets Numelixa notify your server when an event occurs. Your backend can update your database or trigger your own workflow without repeatedly polling the API. Configure a public HTTPS endpoint in your developer settings when webhook management is available for your account.</p><div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:12}}><div style={{padding:14,borderRadius:12,background:"#071b29"}}><b>1. Register endpoint</b><p style={{color:"#91acbc",fontSize:13}}>Provide an HTTPS URL controlled by you, e.g. <code>https://example.com/webhooks/numelixa</code>.</p></div><div style={{padding:14,borderRadius:12,background:"#071b29"}}><b>2. Verify the request</b><p style={{color:"#91acbc",fontSize:13}}>Use a signing secret and verify the signature against the raw request body before trusting the event.</p></div><div style={{padding:14,borderRadius:12,background:"#071b29"}}><b>3. Acknowledge quickly</b><p style={{color:"#91acbc",fontSize:13}}>Return HTTP 2xx promptly, process the work asynchronously, and make handlers idempotent.</p></div></div><button onClick={()=>setShowWebhook(v=>!v)} style={{marginTop:14,padding:"10px 13px",borderRadius:10,border:"1px solid rgba(123,229,216,.3)",background:"#0b2b38",color:"#7be5d8",fontWeight:800}}>{showWebhook?"Hide":"Show"} example webhook receiver</button>{showWebhook&&<Code value={`// Node.js / Express example (illustrative receiver; verify signature using the\n// exact signature header and algorithm documented by your webhook sender).\napp.post("/webhooks/numelixa", express.raw({type:"application/json"}), async (req, res) => {\n  // 1) Verify the signature on req.body before parsing it.\n  // 2) Persist event.id to prevent duplicate processing.\n  // 3) Queue your business logic and respond quickly.\n  res.sendStatus(204);\n});`}/>}<div style={{marginTop:14,fontSize:12,color:"#f0d29b"}}>Important: webhook delivery, signing, retries and dashboard registration must be implemented server-side before treating this as an active production webhook service. This page does not pretend that a setting exists if it has not yet been built.</div></section>
   <section id="errors" style={panel}><h2 style={{marginTop:0}}>06 · Errors, status codes & reliability</h2><div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}><tbody>{[["200/201","Successful request"],["400","Invalid input or missing parameters"],["401","API key missing, invalid or revoked"],["402","Insufficient wallet balance"],["403","Permission or account restriction"],["404","Order or resource not found"],["409","Stock, price or order-state conflict"],["429","Rate limit exceeded"],["500","Unexpected server error"],["502/503","Temporary upstream/service unavailability"]].map(([code,meaning])=><tr key={code}><td style={{padding:10,borderBottom:"1px solid rgba(255,255,255,.06)",fontFamily:"monospace",whiteSpace:"nowrap"}}>{code}</td><td style={{padding:10,borderBottom:"1px solid rgba(255,255,255,.06)",color:"#b4cbd6"}}>{meaning}</td></tr>)}</tbody></table></div><p style={{color:"#a8c0ce"}}>Use timeouts, bounded retries and exponential backoff for safe reads. Avoid retrying a purchase blindly after a network timeout. Do not treat HTML as an API response.</p><Code value={`{ "ok": false, "error": "Human-readable error message" }`}/></section>
   <section id="examples" style={panel}><h2 style={{marginTop:0}}>07 · Language-specific examples</h2><p style={{color:"#a8c0ce"}}>Choose one language. Each complete example checks the account, reads stock and creates an order. Store the API key in an environment variable.</p><div role="tablist" aria-label="Programming language" style={{display:"flex",gap:8,flexWrap:"wrap",margin:"16px 0"}}>{Object.keys(samples).map(lang=><button key={lang} role="tab" aria-selected={language===lang} onClick={()=>setLanguage(lang)} style={{padding:"9px 14px",borderRadius:10,border:"1px solid "+(language===lang?"#7be5d8":"rgba(109,222,230,.15)"),background:language===lang?"#7be5d8":"rgba(123,229,216,.05)",color:language===lang?"#03212a":"#d9f5f4",fontWeight:800}}>{lang}</button>)}</div><Code value={samples[language]}/></section>
   <section style={panel}><h2 style={{marginTop:0}}>Security checklist</h2><ul style={{color:"#b4cbd6",paddingLeft:22}}><li>Never expose API keys in browser JavaScript, mobile apps, screenshots or public repositories.</li><li>Use HTTPS for your backend and webhook receiver.</li><li>Rotate a key immediately if it may have leaked.</li><li>Validate webhook signatures and reject duplicate event IDs.</li><li>Keep a local order ledger and reconcile status after timeouts.</li></ul><a href="https://support.numelixa.com" style={{color:"#7be5d8",fontWeight:800}}>Need help? Contact developer support →</a></section>
  </div>
  <footer style={{marginTop:24,padding:18,borderTop:"1px solid rgba(109,222,230,.12)",fontSize:12,color:"#7895a5"}}>Numelixa Developer Documentation · API v1 · Use the live API contract and account permissions as the source of truth.</footer>
 </main>
}
