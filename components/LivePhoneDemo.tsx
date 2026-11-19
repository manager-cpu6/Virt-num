export default function LivePhoneDemo(){
 return <div className="nx-live-demo" aria-label="Illustrative Numelixa product interface preview">
  <div className="nx-live-glow"/>
  <div className="nx-live-badge"><span/> PRODUCT PREVIEW · ILLUSTRATIVE ONLY</div>
  <div className="nx-live-phone">
   <div className="nx-live-speaker"/>
   <div className="nx-live-screen">
    <div className="nx-live-status"><span>9:41</span><span>●●● 5G</span></div>
    <div className="nx-live-appbar"><span className="nx-live-logo"><img src="/numelixa-brand.svg" alt="" width="24" height="24"/></span><b>Numelixa</b><i>•••</i></div>
    <div className="nx-live-number">
     <small>NUMBER PREVIEW</small>
     <strong>••• ••• ••••</strong>
     <span><i/> Your number appears after a confirmed purchase</span>
    </div>
    <div className="nx-live-sms">
     <div className="nx-live-sms-head"><b>Incoming SMS</b><span>PREVIEW</span></div>
     <strong>Messages appear here</strong>
     <p>No real phone number or verification code is displayed in this preview.</p>
     <small>SMS is shown only when received for your activation.</small>
    </div>
    <div className="nx-live-actions"><span>Copy number</span><span>Copy code</span></div>
   </div>
  </div>
  <div className="nx-live-caption"><span><i/> Product preview</span><b>Illustrative interface · no live number or OTP</b></div>
 </div>;
}
