import Link from "next/link";
const featureStyle={fontSize:12,padding:"7px 10px",borderRadius:999,background:"rgba(0,217,255,.08)",border:"1px solid rgba(0,217,255,.16)",color:"#a8efff"} as const;
function AndroidMark(){return <svg viewBox="0 0 48 48" width="38" height="38" aria-hidden="true"><path fill="currentColor" d="M13 17 9 10l2-1 4 7a18 18 0 0 1 18 0l4-7 2 1-4 7c4 3 6 7 6 12H7c0-5 2-9 6-12Zm-6 14h34v7a3 3 0 0 1-3 3h-3v5h-4v-5H17v5h-4v-5h-3a3 3 0 0 1-3-3v-7Z"/><circle cx="17" cy="23" r="1.8" fill="#071329"/><circle cx="31" cy="23" r="1.8" fill="#071329"/></svg>}
export default function MobileAppsPage(){
 return <main style={{minHeight:"100vh",padding:"28px 18px 70px",color:"#f4f8ff",background:"radial-gradient(ellipse at 50% 0%,rgba(0,217,255,.12),transparent 44%),linear-gradient(180deg,#030817,#071329 55%,#030817)"}}>
  <div style={{maxWidth:1000,margin:"0 auto"}}>
   <Link href="/" style={{color:"#00d9ff",fontWeight:800,textDecoration:"none"}}>← Numelixa</Link>
   <section style={{padding:"42px 4px 28px",display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(260px,1fr))",gap:28,alignItems:"center"}}>
    <div><span style={{color:"#00d9ff",letterSpacing:".18em",fontSize:11,fontWeight:900}}>NUMELIXA MOBILE</span>
     <h1 style={{fontSize:"clamp(40px,8vw,68px)",letterSpacing:"-2.8px",lineHeight:1.02,margin:"14px 0 18px"}}>Your account.<br/><span style={{color:"#00d9ff"}}>In your hands.</span></h1>
     <p style={{maxWidth:570,color:"#a7b7d0",fontSize:16,lineHeight:1.8}}>The official Numelixa mobile experience brings your USD wallet, virtual numbers, SMS verification, order tracking and account security together in one fast native app.</p>
     <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:20}}>{["Official Android APK","USD wallet","Live SMS updates","Secure sign-in","Push notifications"].map(x=><span key={x} style={featureStyle}>{x}</span>)}</div>
    </div>
    <div style={{minHeight:290,borderRadius:30,border:"1px solid rgba(0,217,255,.2)",background:"radial-gradient(circle at 50% 35%,rgba(0,217,255,.2),transparent 50%),linear-gradient(145deg,#0c2342,#071329)",display:"grid",placeItems:"center",boxShadow:"0 30px 90px rgba(0,0,0,.3)"}}>
     <div style={{width:174,padding:12,borderRadius:28,border:"1px solid #38628d",background:"#050d1b",boxShadow:"0 20px 60px #0008"}}>
      <div style={{height:5,width:55,borderRadius:8,background:"#35506f",margin:"0 auto 14px"}}/><div style={{fontWeight:900,fontSize:13}}>Numelixa <span style={{float:"right",fontSize:9,color:"#55e6c8"}}>● LIVE DEMO</span></div>
      <div style={{marginTop:13,padding:12,borderRadius:13,background:"linear-gradient(130deg,#0b4770,#172d61)"}}><small style={{color:"#9ab8d8"}}>USD WALLET</small><div style={{fontSize:25,fontWeight:900,marginTop:5}}>$12.50</div></div>
      <div style={{marginTop:10,padding:11,borderRadius:12,background:"#0b1b32",border:"1px solid #234363"}}><small style={{color:"#66dff5"}}>WHATSAPP · ACTIVE NUMBER</small><b style={{display:"block",fontSize:14,marginTop:7}}>+1 202 ••• 0188</b><small>Waiting for verification SMS</small></div>
      <div style={{marginTop:9,padding:11,borderRadius:12,background:"#0c302e",border:"1px solid #21675f"}}><small style={{color:"#79e8d1"}}>INCOMING OTP</small><b style={{display:"block",fontSize:23,letterSpacing:4,marginTop:6}}>482 916</b><small>Demo message preview</small></div>
      <div style={{display:"flex",justifyContent:"space-around",fontSize:9,color:"#9db5d2",marginTop:13}}>⌂ Home　◎ Buy　▣ Orders　◈ Wallet</div>
     </div>
    </div>
   </section>
   <section style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(260px,1fr))",gap:16}}>
    <article style={{padding:24,borderRadius:26,border:"1px solid rgba(0,217,255,.25)",background:"linear-gradient(145deg,rgba(12,35,65,.96),rgba(5,16,35,.96))"}}>
     <div style={{display:"flex",alignItems:"center",gap:12,color:"#64e6ff"}}><AndroidMark/><span style={{fontSize:11,letterSpacing:2,fontWeight:900}}>ANDROID · OFFICIAL</span></div>
     <h2 style={{fontSize:27,letterSpacing:"-1px",margin:"14px 0 8px"}}>Numelixa for Android</h2>
     <p style={{color:"#a7b7d0",fontSize:14,lineHeight:1.75}}>Install the official APK, sign in securely and manage numbers, wallet top-ups, orders and SMS codes from your phone.</p>
     <a href="https://app.numelixa.com/" style={{boxSizing:"border-box",display:"flex",justifyContent:"center",alignItems:"center",gap:10,textDecoration:"none",marginTop:18,padding:15,borderRadius:14,background:"linear-gradient(100deg,#00d9ff,#168cff)",color:"#031022",fontWeight:950}}>Explore Android app →</a>
     <small style={{display:"block",marginTop:12,color:"#7185a5"}}>Package: com.numelixa.app · Official Numelixa release</small>
    </article>
    <article style={{padding:24,borderRadius:26,border:"1px solid rgba(172,133,255,.2)",background:"linear-gradient(145deg,rgba(33,25,62,.7),rgba(5,16,35,.96))"}}>
     <div style={{display:"flex",alignItems:"center",gap:12,color:"#e9e8f7"}}><span style={{fontSize:38,lineHeight:1}}></span><span style={{fontSize:11,letterSpacing:2,fontWeight:900}}>IOS · IPHONE</span></div>
     <h2 style={{fontSize:27,letterSpacing:"-1px",margin:"14px 0 8px"}}>Numelixa for iPhone</h2>
     <p style={{color:"#a7b7d0",fontSize:14,lineHeight:1.75}}>The iPhone edition is planned with the same account, USD wallet, virtual number and SMS experience.</p>
     <div style={{marginTop:18,padding:15,borderRadius:14,border:"1px solid #5b4b82",background:"#17142a",color:"#e6d9ff",fontWeight:900,textAlign:"center"}}> App Store · Coming Soon</div>
     <small style={{display:"block",marginTop:12,color:"#9186ae"}}>The iOS download will appear here after its official release.</small>
    </article>
   </section>
   <section style={{marginTop:24,padding:22,borderRadius:22,border:"1px solid rgba(0,217,255,.14)",background:"#08172b"}}>
    <h2 style={{marginTop:0}}>Everything you need, in one app</h2>
    <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(190px,1fr))",gap:16,color:"#a7b7d0",fontSize:13,lineHeight:1.7}}>
     <div><b style={{color:"#eff8ff"}}>USD wallet</b><br/>See your available balance and add funds through supported payment methods.</div>
     <div><b style={{color:"#eff8ff"}}>Virtual numbers</b><br/>Choose a service and country, then manage your active number.</div>
     <div><b style={{color:"#eff8ff"}}>SMS verification</b><br/>Receive OTP codes and copy them directly from your notification.</div>
     <div><b style={{color:"#eff8ff"}}>Account security</b><br/>Manage devices, sign-in protection and account settings.</div>
    </div>
   </section>
   <p style={{textAlign:"center",fontSize:12,color:"#7185a5",marginTop:28}}>Numelixa · Global Virtual Numbers</p>
  </div>
 </main>
}