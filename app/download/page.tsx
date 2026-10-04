import Link from "next/link";
import TopBar from "@/components/TopBar";

const apkUrl = "https://github.com/manager-cpu6/Virt-num/releases/download/android-latest/Numelixa.apk";

export default function DownloadPage() {
  return <div>
    <TopBar title="Android App" back />
    <section className="hero-card" style={{minHeight:300,alignItems:"center",gap:18,padding:26}}>
      <div className="hero-copy">
        <span className="eyebrow">NUMELIXA FOR ANDROID</span>
        <h1 style={{fontSize:"clamp(36px,8vw,48px)"}}>Your numbers. One app.</h1>
        <p>Install Numelixa for a focused mobile experience. Sign in with your existing account to access your wallet, orders, verification messages and developer tools.</p>
      </div>
      <div aria-hidden="true" style={{width:76,height:76,flex:"0 0 76px",borderRadius:25,display:"grid",placeItems:"center",fontSize:35,fontWeight:900,color:"#70f4df",background:"linear-gradient(145deg,#202b38,#10151d)",border:"1px solid rgba(112,244,223,.35)",boxShadow:"0 16px 34px rgba(0,0,0,.22)"}}>N</div>
    </section>
    <section className="form-card" style={{marginTop:16,padding:22}}>
      <div className="eyebrow">ANDROID INSTALLER</div>
      <h2 style={{margin:"8px 0",fontSize:24,letterSpacing:"-.04em"}}>Numelixa Android App</h2>
      <p style={{color:"var(--muted)",fontSize:13,lineHeight:1.6}}>Package: <b>com.numelixa.app</b><br/>Updates will use the same app identity and signing key.</p>
      <a className="primary-btn full" href={apkUrl} style={{marginTop:10,boxSizing:"border-box"}}>📱 Download Android App <span>↓</span></a>
      <div className="notice" style={{marginTop:14}}><span>i</span><p>The download is provided through the official Numelixa GitHub release. Android may ask you to allow installation from your browser or file manager.</p></div>
    </section>
    <section style={{margin:"24px 2px"}}>
      <div className="eyebrow">INSTALL IN 3 STEPS</div>
      <ol style={{paddingLeft:22,color:"var(--muted)",fontSize:13,lineHeight:1.9}}>
        <li>Tap <b>Download Android App</b>.</li>
        <li>Open the downloaded <b>Numelixa.apk</b> file.</li>
        <li>Approve Android's install prompt, then open Numelixa and sign in.</li>
      </ol>
      <Link href="/" className="secondary-btn full" style={{boxSizing:"border-box"}}>Back to Numelixa</Link>
    </section>
  </div>;
}
