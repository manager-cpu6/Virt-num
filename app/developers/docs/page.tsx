"use client";
import {useState} from "react";
const BASE="https://numelixa.com/api/v1";
const examples:Record<string,string>={
 "cURL":`# API requests should return JSON directly (no browser login/redirect)
curl --fail-with-body -sS -L "${BASE}/account" \
  -H "Authorization: Bearer ${"$"}NUMELIXA_API_KEY" \
  -H "Accept: application/json"

# Check stock
curl --fail-with-body -sS -L "${BASE}/stock?country=usa&service=whatsapp" \
  -H "Authorization: Bearer ${"$"}NUMELIXA_API_KEY" \
  -H "Accept: application/json"

# Purchase
curl --fail-with-body -sS -L -X POST "${BASE}/orders" \
  -H "Authorization: Bearer ${"$"}NUMELIXA_API_KEY" \
  -H "Content-Type: application/json" \
  -H "Accept: application/json" \
  --data '{"country":"usa","service":"whatsapp"}'`,
 Python:`import os
import requests

BASE = "${BASE}"
KEY = os.environ["NUMELIXA_API_KEY"]
SESSION = requests.Session()
SESSION.headers.update({
    "Authorization": f"Bearer {KEY}",
    "Accept": "application/json",
    "Content-Type": "application/json",
})

def api(method, path, **kwargs):
    # Follow redirects while preserving safe request behavior; inspect final URL/status.
    response = SESSION.request(method, BASE + path, timeout=20,
                               allow_redirects=True, **kwargs)
    if not response.url.startswith(BASE):
        raise RuntimeError(f"Unexpected API redirect to {response.url}")
    try:
        data = response.json()
    except ValueError as exc:
        raise RuntimeError(f"API returned non-JSON (HTTP {response.status_code})") from exc
    if not response.ok or data.get("ok") is False:
        raise RuntimeError(f"HTTP {response.status_code}: {data.get('error', 'API request failed')}")
    return data

print(api("GET", "/account"))
stock = api("GET", "/stock?country=usa&service=whatsapp")
print("Stock:", stock)
order = api("POST", "/orders", json={"country": "usa", "service": "whatsapp"})
print("Order:", order)`,
 "JavaScript":`const BASE = "${BASE}";
const KEY = process.env.NUMELIXA_API_KEY;

async function api(path, options = {}) {
  const response = await fetch(BASE + path, {
    ...options,
    redirect: "manual",
    headers: {
      Authorization: `Bearer ${"$"}{KEY}`,
      Accept: "application/json",
      "Content-Type": "application/json",
      ...options.headers,
    },
  });
  if (response.status >= 300 && response.status < 400) {
    throw new Error("Unexpected API redirect. Check the API deployment/base URL.");
  }
  const data = await response.json();
  if (!response.ok || data.ok === false) {
    throw new Error(data.error || `HTTP ${"$"}{response.status}`);
  }
  return data;
}

const account = await api("/account");
console.log(account);
const stock = await api("/stock?country=usa&service=whatsapp");
console.log(stock);
const order = await api("/orders", {
  method: "POST",
  body: JSON.stringify({ country: "usa", service: "whatsapp" }),
});
console.log(order);`,
 PHP:`<?php
$base = "${BASE}";
$key = getenv("NUMELIXA_API_KEY");
function numelixa($method, $path, $payload = null) {
  global $base, $key;
  $headers = ["Authorization: Bearer " . $key, "Accept: application/json", "Content-Type: application/json"];
  $ch = curl_init($base . $path);
  curl_setopt_array($ch, [CURLOPT_RETURNTRANSFER => true, CURLOPT_FOLLOWLOCATION => true,
    CURLOPT_MAXREDIRS => 3, CURLOPT_CUSTOMREQUEST => $method, CURLOPT_HTTPHEADER => $headers, CURLOPT_TIMEOUT => 20]);
  if ($payload !== null) curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
  $body = curl_exec($ch); $status = curl_getinfo($ch, CURLINFO_HTTP_CODE); $url = curl_getinfo($ch, CURLINFO_EFFECTIVE_URL);
  if ($body === false) throw new RuntimeException(curl_error($ch));
  curl_close($ch);
  if (strpos($url, $base) !== 0) throw new RuntimeException("Unexpected redirect target");
  $data = json_decode($body, true);
  if ($status < 200 || $status >= 300 || !is_array($data) || (($data["ok"] ?? true) === false))
    throw new RuntimeException($data["error"] ?? "Numelixa API request failed");
  return $data;
}
print_r(numelixa("GET", "/account"));
print_r(numelixa("POST", "/orders", ["country" => "usa", "service" => "whatsapp"]));`,
 Go:`package main
import ("encoding/json"; "fmt"; "net/http"; "bytes"; "os"; "io")
const base = "${BASE}"
func main() {
  req, _ := http.NewRequest("GET", base+"/account", nil)
  req.Header.Set("Authorization", "Bearer "+os.Getenv("NUMELIXA_API_KEY"))
  req.Header.Set("Accept", "application/json")
  client := &http.Client{CheckRedirect: func(req *http.Request, via []*http.Request) error { return http.ErrUseLastResponse }}
  res, err := client.Do(req); if err != nil { panic(err) }; defer res.Body.Close()
  body, _ := io.ReadAll(res.Body)
  if res.StatusCode >= 300 && res.StatusCode < 400 { panic("Unexpected redirect: "+res.Header.Get("Location")) }
  if res.StatusCode < 200 || res.StatusCode >= 300 { panic(fmt.Sprintf("HTTP %d: %s", res.StatusCode, body)) }
  var data map[string]any; if err := json.Unmarshal(body, &data); err != nil { panic(err) }; fmt.Println(data)
  _ = bytes.NewBuffer(nil)
}`,
 Ruby:`require "net/http"
require "json"
require "uri"
base = "${BASE}"
uri = URI(base + "/account")
request = Net::HTTP::Get.new(uri)
request["Authorization"] = "Bearer #{ENV.fetch("NUMELIXA_API_KEY")}"
request["Accept"] = "application/json"
response = Net::HTTP.start(uri.hostname, uri.port, use_ssl: true) { |http| http.request(request) }
raise "Unexpected redirect: #{response["location"]}" if response.is_a?(Net::HTTPRedirection)
data = JSON.parse(response.body)
raise(data["error"] || "API failed") unless response.is_a?(Net::HTTPSuccess) && data["ok"] != false
puts data.inspect`,
 Java:`import java.net.URI;
import java.net.http.*;
public class Main {
  public static void main(String[] args) throws Exception {
    String base = "${BASE}";
    String key = System.getenv("NUMELIXA_API_KEY");
    HttpClient client = HttpClient.newBuilder().followRedirects(HttpClient.Redirect.NEVER).build();
    HttpRequest request = HttpRequest.newBuilder(URI.create(base + "/account"))
      .header("Authorization", "Bearer " + key).header("Accept", "application/json").GET().build();
    HttpResponse<String> response = client.send(request, HttpResponse.BodyHandlers.ofString());
    if (response.statusCode() >= 300 && response.statusCode() < 400) throw new RuntimeException("Unexpected redirect");
    if (response.statusCode() < 200 || response.statusCode() >= 300) throw new RuntimeException("HTTP " + response.statusCode() + ": " + response.body());
    System.out.println(response.body());
  }
}`
};
const languages=Object.keys(examples);
function Code({value}:{value:string}){const[done,setDone]=useState(false);return <div style={{position:"relative",margin:"12px 0 24px"}}><pre style={{overflowX:"auto",whiteSpace:"pre-wrap",wordBreak:"break-word",padding:"18px 56px 18px 16px",borderRadius:15,background:"#01191f",border:"1px solid rgba(121,246,229,.13)",color:"#c9eeea",fontSize:12,lineHeight:1.65}}>{value}</pre><button onClick={async()=>{try{await navigator.clipboard.writeText(value);setDone(true);setTimeout(()=>setDone(false),1500)}catch{}}} style={{position:"absolute",right:10,top:10,border:"1px solid rgba(121,246,229,.2)",background:"rgba(114,223,206,.08)",color:"#72dfce",borderRadius:9,padding:"7px 9px",fontSize:11,fontWeight:900}}>{done?"Copied":"Copy code"}</button></div>}
export default function Docs(){
 const[language,setLanguage]=useState("Python");
 const[endpoint,setEndpoint]=useState("GET /account");
 return <main className="numelixa-docs-page" style={{maxWidth:1120,margin:"0 auto",padding:"24px 18px 80px",color:"#eafff9",lineHeight:1.7}}>
 <a href="https://numelixa.com" aria-label="Back to Numelixa" title="Back to Numelixa">← Numelixa</a>
 <div style={{fontSize:11,letterSpacing:3,color:"#72dfce",fontWeight:900,marginTop:22}}>NUMELIXA DEVELOPER PLATFORM · API V1</div>
 <h1 style={{fontSize:clamp(32,44,44),letterSpacing:-2.5,margin:"8px 0"}}>API Documentation</h1>
 <p style={{color:"#86a8a9",maxWidth:850}}>Production REST API for virtual numbers. All endpoints use JSON. Send your API key with every request; browser cookies and interactive sign-in should not be required for API-key requests.</p>
 <div style={{padding:18,borderRadius:18,background:"rgba(5,39,47,.75)",border:"1px solid rgba(121,246,229,.14)"}}><b>Base URL</b><p><code>{BASE}</code></p><b>Authentication</b><p><code>Authorization: Bearer YOUR_SECRET_API_KEY</code></p><p style={{color:"#7e9e9f",fontSize:12}}>Keep the secret on your server. Never embed it in a public website or mobile app. Set NUMELIXA_API_KEY as an environment variable.</p></div>
 <section style={{marginTop:30}}><h2>Quick start · choose your language</h2><p style={{color:"#86a8a9"}}>Select a language below. Each tab shows a copy-ready example for checking the authenticated account and includes safe handling for unexpected redirects and API errors.</p>
 <div role="tablist" aria-label="Programming language" style={{display:"flex",gap:8,flexWrap:"wrap",margin:"16px 0"}}>{languages.map(lang=><button key={lang} role="tab" aria-selected={language===lang} onClick={()=>setLanguage(lang)} style={{padding:"9px 14px",borderRadius:10,border:"1px solid "+(language===lang?"#72dfce":"rgba(121,246,229,.15)"),background:language===lang?"#72dfce":"rgba(114,223,206,.05)",color:language===lang?"#03242b":"#c9eeea",fontWeight:800}}>{lang}</button>)}</div>
 <Code value={examples[language]}/>
 </section>
 <section style={{marginTop:42}}><h2>Endpoint reference</h2><p style={{color:"#86a8a9"}}>Use the exact base URL above. API endpoints must return JSON rather than redirecting to a website login page. If you receive HTML or a 3xx response, inspect the response and do not treat it as a successful API result.</p>
 <label htmlFor="endpoint">Choose an endpoint</label><select id="endpoint" value={endpoint} onChange={e=>setEndpoint(e.target.value)} style={{display:"block",width:"100%",maxWidth:420,margin:"10px 0",padding:12,borderRadius:10,background:"#041e25",color:"#eafff9",border:"1px solid rgba(121,246,229,.2)"}}>{["GET /account","GET /balance","GET /transactions","GET /services","GET /countries?service=whatsapp","GET /stock?country=usa&service=whatsapp","POST /orders","GET /orders","GET /orders/ORDER_ID","POST /orders/code","POST /orders/cancel"].map(x=><option key={x}>{x}</option>)}</select>
 <Code value={`curl --fail-with-body -sS -L -X ${"$"}{endpoint.startsWith("POST")?"POST":"GET"} "https://numelixa.com/api/v1/${"$"}{endpoint.replace(/^(GET|POST) \/?/,"")}" \\\n  -H "Authorization: Bearer ${"$"}NUMELIXA_API_KEY" \\\n  -H "Accept: application/json" \\\n  -H "Content-Type: application/json"${"$"}{endpoint==="POST /orders"?' \\\n  --data \'{"country":"usa","service":"whatsapp"}\'':endpoint==="POST /orders/code"||endpoint==="POST /orders/cancel"?' \\\n  --data \'{"orderId":"ORDER_ID"}\'':""}`}/>
 <p style={{color:"#86a8a9",fontSize:12}}>For purchase, SMS retrieval and cancellation, use the endpoint-specific request body shown below. Do not blindly retry a purchase after a timeout; first check order status.</p>
 </section>
 <section style={{marginTop:42}}><h2>Common request bodies</h2><h3>Purchase a number · POST /orders</h3><Code value={`{"country":"usa","service":"whatsapp"}`}/><h3>Retrieve SMS · POST /orders/code</h3><Code value={`{"orderId":"ORDER_ID"}`}/><h3>Cancel eligible waiting order · POST /orders/cancel</h3><Code value={`{"orderId":"ORDER_ID"}`}/></section>
 <section style={{marginTop:42}}><h2>Errors and status codes</h2><div style={{overflowX:"auto"}}><table style={{width:"100%",borderCollapse:"collapse",fontSize:13}}><tbody>{[["200","Success"],["400","Invalid or missing parameters"],["401","Missing, invalid or revoked API key"],["402","Insufficient wallet balance"],["403","Account verification or permission required"],["404","Order/resource not found"],["409","Stock, price or order-state conflict"],["429","Rate limit exceeded"],["500","Unexpected server error"],["502","Temporary upstream number-service failure"],["503","Number service unavailable"]].map(([a,b])=><tr key={a}><td style={{padding:10,borderBottom:"1px solid rgba(255,255,255,.06)",fontFamily:"monospace"}}>{a}</td><td style={{padding:10,borderBottom:"1px solid rgba(255,255,255,.06)"}}>{b}</td></tr>)}</tbody></table></div><Code value={`{"ok":false,"error":"Human-readable error message"}`}/></section>
 <section style={{marginTop:42}}><h2>Production best practices</h2><ul><li>Store keys in environment variables or a secrets manager.</li><li>Refresh stock and price immediately before purchase.</li><li>Save the returned order ID and reconcile after network timeouts.</li><li>Use exponential backoff for SMS polling; stop when completed, cancelled or expired.</li><li>Handle 401 by checking key status, never by redirecting API users to browser sign-in.</li><li>Do not expose provider credentials or internal routing choices.</li></ul></section>
 <footer style={{marginTop:50,padding:20,borderRadius:18,background:"rgba(114,223,206,.05)",border:"1px solid rgba(114,223,206,.12)"}}><b>API contract</b><p style={{color:"#78999a",marginBottom:0}}>This reference documents the intended API behavior. Verify all endpoints against the current production deployment before relying on examples in production; language snippets have not been executed against your live account in this chat.</p></footer>
 </main>
}
