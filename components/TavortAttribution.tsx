type TavortAttributionProps={mode?:"from"|"company";className?:string};
export default function TavortAttribution({mode="company",className=""}:TavortAttributionProps){
 const label=mode==="from"?"From Tavort":"A Tavort Company";
 return <span className={className} style={{display:"block",margin:"14px auto 0",textAlign:"center",color:"var(--muted,#8290a3)",fontSize:11,fontWeight:650,letterSpacing:".045em",lineHeight:1.5}}>{label}</span>;
}
