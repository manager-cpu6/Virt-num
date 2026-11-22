import Link from "next/link";

const card={padding:26,borderRadius:26,border:"1px solid rgba(0,217,255,.22)",background:"linear-gradient(145deg,rgba(12,35,65,.96),rgba(5,16,35,.98))",boxShadow:"0 24px 70px rgba(0,0,0,.24)"} as const;
function AndroidMark(){return <svg viewBox="0 0 48 48" width="42" height="42" aria-hidden="true"><path fill="currentColor" d="M13 17 9 10l2-1 4 7a18 18 0 0 1 18 0l4-7 2 1-4 7c4 3 6 7 6 12H7c0-5 2-9 6-12Zm-6 14h34v7a3 3 0 0 1-3 3h-3v5h-4v-5H17v5h-4v-5h-3a3 3 0 0 1-3-3v-7Z"/></svg>}
function AppleMark(){return <svg viewBox="0 0 48 48" width="42" height="42" aria-hidden="true"><path fill="currentColor" d="M31.8 25.5c.1 7.1 6.2 9.5 6.3 9.5-.1.2-1 3.4-3.2 6.7-1.9 2.8-3.9 5.5-7 5.6-3.1.1-4.1-1.8-7.7-1.8s-4.8 1.7-7.7 1.9c-3 .1-5.3-3-7.2-5.8C.9 33.9-1 23.3 3 16.6c2-3.3 5.5-5.4 9.2-5.4 2.9 0 5.7 2 7.5 2s5.2-2.4 8.8-2.1c1.5.1 5.8.6 8.6 4.6-.2.1-5.1 3-5.3 9.8ZM26.6 7.8C28.2 5.9 29.3 3.2 29 0c-2.4.1-5.2 1.6-6.9 3.5-1.5 1.7-2.8 4.5-2.5 7.1 2.7.2 5.4-1.3 7-2.8Z" transform="translate(5 1) scale(.82)"/></svg>}
export default function MobileAppsPage(){return <main style={{minHeight:"100vh",padding:"28px 18px 70px",color:"#f4f8ff",background:"radial-gradient(ellipse at 50% 0%,rgba(0,217,255,.13),transparent 44%),linear-gradient(180deg,#030817,#071329 55%,#030817)"}}>
 <div style={{maxWidth:980,margin:"0 auto"}}>
  <Link href="/" style={{color:"#00d9ff",fontWeight:800,textDecoration:"none"}}>← Numelixa</Link>
  <header style={{padding:"50px 4px 34px",textAlign:"center"}}>
   <span style={{color:"#00d9ff",letterSpacing:".2em",fontSize:11,fontWeight:900}}>NUMELIXA MOBILE</span>
   <h1 style={{fontSize:"clamp(38px,7vw,62px)",letterSpacing:"-2.5px",lineHeight:1.05,margin:"14px 0"}}>Your account.<br/><span style={{color:"#00d9ff"}}>In your hands.</span></h1>
   <p style={{maxWidth:620,margin:"0 auto",color:"#a7b7d0",fontSize:15,lineHeight:1.8}}>Choose your platform to access the official Numelixa mobile experience for your wallet, virtual numbers, SMS verification and orders.</p>
  </header>
  <section style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,310px),1fr))",gap:18}}>
   <article style={card}>
    <div style={{display:"flex",alignItems:"center",gap:13,color:"#64e6ff"}}><AndroidMark/><span style={{fontSize:11,letterSpacing:2,fontWeight:900}}>ANDROID · OFFICIAL</span></div>
    <h2 style={{fontSize:29,letterSpacing:"-1px",margin:"18px 0 8px"}}>Numelixa for Android</h2>
    <p style={{color:"#a7b7d0",fontSize:14,lineHeight:1.8}}>Install the official Numelixa APK and manage your wallet, virtual numbers, verification messages, orders and notifications from your Android phone.</p>
    <a href="https://app.numelixa.com/" style={{display:"flex",justifyContent:"center",alignItems:"center",gap:10,textDecoration:"none",marginTop:22,padding:15,borderRadius:14,background:"linear-gradient(100deg,#00d9ff,#168cff)",color:"#031022",fontWeight:950}}>Numelixa for Android <span>→</span></a>
    <small style={{display:"block",marginTop:13,color:"#7185a5"}}>Package: com.numelixa.app · Official APK</small>
   </article>
   <article style={{...card,borderColor:"rgba(172,133,255,.24)",background:"linear-gradient(145deg,rgba(33,25,62,.78),rgba(5,16,35,.98))"}}>
    <div style={{display:"flex",alignItems:"center",gap:13,color:"#e9e8f7"}}><AppleMark/><span style={{fontSize:11,letterSpacing:2,fontWeight:900}}>IOS · IPHONE</span></div>
    <h2 style={{fontSize:29,letterSpacing:"-1px",margin:"18px 0 8px"}}>Numelixa for iPhone</h2>
    <p style={{color:"#a7b7d0",fontSize:14,lineHeight:1.8}}>The iPhone edition is planned with the same Numelixa account, wallet, virtual-number and SMS experience.</p>
    <div style={{marginTop:22,padding:15,borderRadius:14,border:"1px solid #5b4b82",background:"#17142a",color:"#e6d9ff",fontWeight:900,textAlign:"center"}}>Numelixa for iPhone · Coming Soon</div>
    <small style={{display:"block",marginTop:13,color:"#9186ae"}}>The official iPhone download will appear here after release.</small>
   </article>
  </section>
  <p style={{textAlign:"center",fontSize:12,color:"#7185a5",marginTop:34}}>Numelixa · Global Virtual Numbers</p>
 </div>
</main>}
