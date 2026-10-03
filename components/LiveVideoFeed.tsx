"use client";
import {useEffect,useRef,useState} from "react";

const videos=[
 "https://assets.mixkit.co/videos/preview/mixkit-waves-in-the-water-1164-large.mp4",
 "https://flutter.github.io/assets-for-api-docs/assets/videos/bee.mp4"
];

export default function LiveVideoFeed(){
 const ref=useRef<HTMLVideoElement|null>(null),[index,setIndex]=useState(0);
 useEffect(()=>{
   const timer=window.setInterval(()=>setIndex(v=>(v+1)%videos.length),12000);
   return()=>window.clearInterval(timer);
 },[]);
 useEffect(()=>{
   const v=ref.current;if(!v)return;
   v.load();
   v.play().catch(()=>{});
 },[index]);
 return <section className="home-live-card" aria-label="Numelixa live visual feed">
   <video ref={ref} className="home-live-video" muted autoPlay loop playsInline preload="metadata" key={videos[index]}>
     <source src={videos[index]} type="video/mp4"/>
   </video>
   <div className="home-live-shade"/>
   <div className="home-live-content">
     <div className="live-pill"><i className="live-dot"/> LIVE • NUMELIXA</div>
     <div className="live-caption">
       <span className="eyebrow">LIVE ACTIVITY</span>
       <h2>Fast numbers. Live SMS.</h2>
       <p>Watch the live visual while you browse services, countries and available numbers.</p>
       <div className="live-metrics"><span>● Live stock</span><span>⚡ Fast checkout</span><span>⌁ SMS ready</span></div>
       <div className="live-bars" aria-hidden="true">{Array.from({length:7},(_,i)=><i key={i}/>)}</div>
     </div>
   </div>
 </section>
}