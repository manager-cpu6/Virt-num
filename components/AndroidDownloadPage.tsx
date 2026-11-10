import Link from "next/link";

async function getRelease(){
  try{
    const [r,s]=await Promise.all([
      fetch("https://api.github.com/repos/manager-cpu6/Numelixa-app/releases/tags/android-latest",{headers:{Accept:"application/vnd.github+json"},cache:"no-store"}),
      fetch("https://raw.githubusercontent.com/manager-cpu6/Numelixa-app/main/pubspec.yaml",{cache:"no-store"})
    ]);
    if(!r.ok||!s.ok)return null;
    const [release,source]=await Promise.all([r.json(),s.text()]);
    if(release.draft||release.prerelease)return null;
    const version=source.match(/^version:\s*([\d.]+\+\d+)\s*$/m)?.[1]||"";
    const apk=release.assets?.find((a:any)=>a.name==="Numelixa.apk");
    if(!version||!apk||apk.size<20*1024*1024)return null;
    return {version,size:(apk.size/1024/1024).toFixed(1),date:apk.updated_at};
  }catch{return null}
}

function PhonePreview({variant="home"}:{variant?:string}){
 return <div className={`nxdl-phone nxdl-phone-${variant}`}>
  <div className="nxdl-phone-top"><span>9:41</span><span>● ● ● ▰</span></div>
  <div className="nxdl-appbar"><img src="/numelixa-favicon.png" alt="Numelixa app icon"/><b>Numelixa</b><span>•••</span></div>
  {variant==="home"?<><div className="nxdl-greeting"><small>YOUR NUMELIXA WALLET</small><strong>$24.80</strong><span>Available balance</span></div><div className="nxdl-quick"><i>＋</i><i>⌕</i><i>◷</i></div><div className="nxdl-phone-label">Choose a service</div><div className="nxdl-services"><span>◉<b>WhatsApp</b></span><span>✉<b>Telegram</b></span><span>◎<b>Other</b></span><span>✦<b>More</b></span></div><div className="nxdl-order"><span>Recent activity</span><b>Verification ready</b><small>Your number is waiting for a code</small></div></>:<><div className="nxdl-screen-title">Your number is ready</div><div className="nxdl-number">+1 202 ••• 0184</div><div className="nxdl-code"><small>VERIFICATION CODE</small><b>482 915</b><span>Message received securely</span></div><div className="nxdl-progress"><i/></div><div className="nxdl-order"><b>Live SMS updates</b><small>Stay up to date as your order changes</small></div></>}
  <div className="nxdl-bottom"><span>⌂</span><span>▣</span><span>◉</span><span>☻</span></div>
 </div>
}

export default async function AndroidDownloadPage(){
 const release=await getRelease();
 return <div className="nxdl-page">
  <div className="nxdl-glow nxdl-glow-one"/><div className="nxdl-glow nxdl-glow-two"/>
  <header className="nxdl-nav">
   <Link href="/" className="nxdl-brand"><img src="/numelixa-favicon.png" alt="Numelixa logo"/><span><b>Numelixa</b><small>ANDROID APP</small></span></Link>
   <nav><a href="#features">Features</a><a href="#screens">App preview</a><a href="#faq">FAQ</a></nav>
   <a className="nxdl-nav-cta" href="/api/mobile/apk">Download APK <span>↓</span></a>
  </header>
  <main>
   <section className="nxdl-hero">
    <div className="nxdl-hero-copy">
     <div className="nxdl-eyebrow"><i/> OFFICIAL NUMELIXA ANDROID APP</div>
     <h1>Your numbers.<br/><em>Your world.</em><br/>In your pocket.</h1>
     <p className="nxdl-lead">Get a smoother way to manage virtual numbers and SMS verification. Choose a service, select a country, follow your order and see incoming codes — right from your Android phone.</p>
     <div className="nxdl-actions"><a className="nxdl-download" href="/api/mobile/apk"><span className="nxdl-android">↓</span><span><b>Download for Android</b><small>Official APK · Free download</small></span><strong>→</strong></a><a className="nxdl-secondary" href="https://www.numelixa.com">Explore Numelixa <span>↗</span></a></div>
     <div className="nxdl-trust"><span>✓ Official Numelixa release</span><span>✓ Secure account sign-in</span><span>✓ Direct APK download</span></div>
     <div className="nxdl-version">
      <span className="nxdl-live-dot"/> {release?<>Latest version <b>{release.version}</b><i/> {release.size} MB APK</>:<>Official Android release <b>Download available</b></>}
     </div>
    </div>
    <div className="nxdl-visual" aria-label="Numelixa Android app screen preview">
     <div className="nxdl-orbit nxdl-orbit-a"/><div className="nxdl-orbit nxdl-orbit-b"/>
     <div className="nxdl-float nxdl-float-top"><span>✦</span><b>Live SMS</b><small>Stay in the loop</small></div>
     <PhonePreview/>
     <div className="nxdl-float nxdl-float-bottom"><span>✓</span><b>One simple workspace</b><small>Numbers · Wallet · Orders</small></div>
    </div>
   </section>
   <section className="nxdl-highlights"><div><b>01</b><span><strong>Choose with clarity</strong><small>Browse services and countries in a clean mobile flow.</small></span></div><div><b>02</b><span><strong>Follow every order</strong><small>See order status and incoming SMS in one place.</small></span></div><div><b>03</b><span><strong>Stay connected</strong><small>Receive helpful notifications about your activity.</small></span></div></section>
   <section id="features" className="nxdl-features">
    <div className="nxdl-section-heading"><span>MADE FOR YOUR PHONE</span><h2>Less friction.<br/><em>More control.</em></h2><p>Everything important is close at hand, with a focused Android experience designed around your everyday workflow.</p></div>
    <div className="nxdl-feature-grid">
     <article><i>◈</i><b>Your wallet, at a glance</b><p>See your available balance and manage top-ups through the payment methods offered in your account.</p></article>
     <article><i>⌕</i><b>Find the right number</b><p>Choose a supported service and country, with clear pricing before placing an order.</p></article>
     <article><i>✉</i><b>SMS in one place</b><p>Keep track of incoming verification messages and order progress from your app.</p></article>
     <article><i>♧</i><b>Account security</b><p>Sign in to your own account and manage your active sessions and security settings.</p></article>
     <article><i>◷</i><b>Useful notifications</b><p>Stay informed when important order and account updates arrive on your device.</p></article>
     <article><i>✧</i><b>Designed for Android</b><p>A mobile-first interface with touch-friendly controls and a streamlined navigation flow.</p></article>
    </div>
   </section>
   <section id="screens" className="nxdl-screens">
    <div className="nxdl-section-heading"><span>TAKE A CLOSER LOOK</span><h2>Your Numelixa workspace,<br/><em>on the move.</em></h2><p>A visual preview of the app experience. The screens shown are illustrative previews.</p></div>
    <div className="nxdl-screen-gallery"><div className="nxdl-screen-copy"><b>Everything in one view</b><p>Check your wallet, jump into services and keep an eye on recent activity without digging through menus.</p><div className="nxdl-screen-points"><span>✓ Simple navigation</span><span>✓ Clear balance and activity</span><span>✓ Mobile-first layout</span></div></div><div className="nxdl-mini-phone"><PhonePreview variant="sms"/></div><div className="nxdl-screen-quote"><span>“</span><h3>From number selection to SMS updates, keep your workflow together.</h3><small>NUMELIXA · ANDROID</small></div></div>
   </section>
   <section className="nxdl-download-band">
    <div><span>READY TO GET STARTED?</span><h2>Bring Numelixa<br/>with you.</h2><p>Download the official Android APK and sign in to your Numelixa account.</p></div>
    <a href="/api/mobile/apk" className="nxdl-download nxdl-download-light"><span className="nxdl-android">↓</span><span><b>Download Numelixa APK</b><small>{release?release.version+" · "+release.size+" MB · Android": "Official Android APK"}</small></span><strong>→</strong></a>
   </section>
   <section id="faq" className="nxdl-faq"><div className="nxdl-section-heading"><span>GOOD TO KNOW</span><h2>Quick answers.</h2></div><div className="nxdl-faq-grid">
    <article><b>Is this the official Numelixa APK?</b><p>Yes. This is the official Android download page for Numelixa. The download is served through Numelixa's own domain.</p></article>
    <article><b>Is the APK free to download?</b><p>Yes. Downloading and installing the app is free. Some services and transactions inside Numelixa may have their own prices.</p></article>
    <article><b>How do I install it?</b><p>Download the APK, open the downloaded file and follow Android's installation prompts. Only install updates from official Numelixa links.</p></article>
    <article><b>Will my existing account work?</b><p>Sign in with your existing Numelixa account. Keep your app updated to receive the latest improvements.</p></article>
   </div></section>
   <section className="nxdl-last"><img src="/numelixa-favicon.png" alt="Numelixa icon"/><h2>One app. Your Numelixa workspace.</h2><a href="/api/mobile/apk">Download the Android app <span>↓</span></a></section>
  </main>
  <footer className="nxdl-footer"><span>© 2026 Numelixa. All rights reserved.</span><div><a href="https://www.numelixa.com/privacy">Privacy</a><a href="https://www.numelixa.com/terms">Terms</a><a href="https://www.numelixa.com/faq">Help center</a><a href="https://www.numelixa.com">Main website</a></div></footer>
  <script type="application/ld+json" dangerouslySetInnerHTML={{__html:JSON.stringify({"@context":"https://schema.org","@type":"SoftwareApplication","name":"Numelixa","alternateName":["Numelixa APK","Numelixa Android App","Numelixa App"],"applicationCategory":"BusinessApplication","operatingSystem":"Android","description":"Official Numelixa Android app for managing virtual numbers, SMS verification, wallet, orders and account notifications.","downloadUrl":"https://app.numelixa.com/api/mobile/apk","installUrl":"https://app.numelixa.com/","offers":{"@type":"Offer","price":"0","priceCurrency":"USD"},"publisher":{"@type":"Organization","name":"Numelixa","url":"https://numelixa.com"},"image":"https://numelixa.com/numelixa-favicon.png","softwareVersion":release?.version||undefined,"fileSize":release?.size?release.size+" MB":undefined})}}/>
 </div>
}
