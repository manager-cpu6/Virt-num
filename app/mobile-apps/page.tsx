import Link from "next/link";
import InstallShortcutButton from "@/components/InstallShortcutButton";

const featureStyle={fontSize:12,padding:"7px 10px",borderRadius:999,background:"rgba(0,217,255,.08)",border:"1px solid rgba(0,217,255,.16)",color:"#a8efff"} as const;
export default function MobileAppsPage(){
 return <main style={{minHeight:"100vh",padding:"28px 18px 70px",color:"#f4f8ff",background:"radial-gradient(ellipse at 50% 0%,rgba(0,217,255,.12),transparent 44%),linear-gradient(180deg,#030817,#071329 55%,#030817)"}}>
  <div style={{maxWidth:1000,margin:"0 auto"}}>
   <Link href="/" style={{color:"#00d9ff",fontWeight:800,textDecoration:"none"}}>← Numelixa</Link>
   <section style={{padding:"42px 4px 28px",display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(260px,1fr))",gap:28,alignItems:"center"}}>
    <div><span className="eyebrow" style={{color:"#00d9ff",letterSpacing:".18em"}}>NUMELIXA MOBILE</span>
     <h1 style={{fontSize:"clamp(40px,8vw,68px)",letterSpacing:"-2.8px",lineHeight:1.02,margin:"14px 0 18px"}}>Your account.<br/><span style={{color:"#00d9ff"}}>In your hands.</span></h1>
     <p style={{maxWidth:570,color:"#a7b7d0",fontSize:16,lineHeight:1.8}}>Download the official Numelixa Android app for a focused mobile experience with your wallet, virtual numbers, SMS orders and account notifications.</p>
     <div style={{display:"flex",gap:8,flexWrap:"wrap",marginTop:20}}>{["Official Android APK","Secure account","Live SMS orders","Mobile notifications"].map(x=><span key={x} style={featureStyle}>{x}</span>)}</div>
    </div>
    <div aria-hidden="true" style={{minHeight:240,borderRadius:30,border:"1px solid rgba(0,217,255,.2)",background:"radial-gradient(circle at 50% 35%,rgba(0,217,255,.2),transparent 50%),linear-gradient(145deg,#0c2342,#071329)",display:"grid",placeItems:"center",boxShadow:"0 30px 90px rgba(0,0,0,.3)"}}>
     <div style={{width:132,height:132,borderRadius:36,display:"grid",placeItems:"center",background:"linear-gradient(145deg,#00d9ff,#1677ff)",boxShadow:"0 15px 45px rgba(0,217,255,.2)",fontSize:68,color:"#031022"}}>◉</div>
    </div>
   </section>
   <section style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(270px,1fr))",gap:16}}>
    <article style={{padding:26,borderRadius:26,border:"1px solid rgba(0,217,255,.2)",background:"linear-gradient(145deg,rgba(12,35,65,.96),rgba(5,16,35,.96))",boxShadow:"0 20px 60px rgba(0,0,0,.2)"}}>
     <div style={{fontSize:36,marginBottom:14}}>▣</div><span className="eyebrow" style={{color:"#00d9ff"}}>ANDROID · OFFICIAL</span>
     <h2 style={{fontSize:29,letterSpacing:"-1px",margin:"8px 0"}}>Numelixa for Android</h2>
     <p style={{color:"#a7b7d0",fontSize:14,lineHeight:1.75}}>Get the newest Numelixa mobile release. The download link serves the app release configured for this website rather than the previous mobile build.</p>
     <a href="/api/mobile/apk" className="primary-btn full" style={{boxSizing:"border-box",display:"flex",justifyContent:"center",alignItems:"center",gap:10,textDecoration:"none",marginTop:20}}>Download Android APK <span>↓</span></a>
     <small style={{display:"block",marginTop:12,color:"#7185a5"}}>Package: com.numelixa.app · Android installation may ask you to allow this source.</small>
    </article>
    <article style={{padding:26,borderRadius:26,border:"1px solid rgba(113,59,255,.25)",background:"linear-gradient(145deg,rgba(22,25,62,.9),rgba(5,16,35,.96))"}}>
     <div style={{fontSize:36,marginBottom:14}}>⌂</div><span className="eyebrow" style={{color:"#9e9bff"}}>BROWSER APP</span>
     <h2 style={{fontSize:29,letterSpacing:"-1px",margin:"8px 0"}}>Install or create shortcut</h2>
     <p style={{color:"#a7b7d0",fontSize:14,lineHeight:1.75}}>Install the Numelixa website as a browser app or add a home-screen shortcut for quick access. On supported browsers, use the install prompt below.</p>
     <div style={{marginTop:20}}><InstallShortcutButton/></div>
     <p style={{color:"#7185a5",fontSize:12,lineHeight:1.65,marginTop:14}}>If no install prompt appears, open your browser menu (⋮) and select “Install app” or “Add to Home screen”.</p>
    </article>
   </section>
   <p style={{textAlign:"center",fontSize:12,color:"#7185a5",marginTop:28}}>Numelixa · Global Virtual Numbers</p>
  </div>
 </main>
}