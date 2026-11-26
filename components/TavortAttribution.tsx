type TavortAttributionProps={mode?:"from"|"company";className?:string};
export default function TavortAttribution({mode="company",className=""}:TavortAttributionProps){
 const label=mode==="from"?"From Tavort":"A Tavort Company";
 return <div className={className} aria-label={label} style={{display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",gap:5,margin:"18px auto 0",textAlign:"center"}}>
  <span style={{color:"var(--muted,#8290a3)",fontSize:11,fontWeight:700,letterSpacing:".06em",lineHeight:1.4}}>{label}</span>
  <span aria-hidden="true" style={{display:"grid",placeItems:"center",width:34,height:34,fontSize:24,lineHeight:1,fontWeight:900,letterSpacing:"-.08em",fontFamily:"Arial,Helvetica,sans-serif",color:"#75b9ff",background:"transparent",border:0,boxShadow:"none"}}>T</span>
  <span style={{color:"var(--muted,#8290a3)",fontSize:9,fontWeight:700,letterSpacing:".16em",lineHeight:1.2}}>TAVORT</span>
 </div>;
}