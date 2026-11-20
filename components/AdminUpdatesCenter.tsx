"use client";
import {useCallback,useEffect,useState} from "react";

type Channel={_id:string;name:string;slug:string;description?:string;category?:string;status:string;visibility?:string;verified?:boolean;featured?:boolean;avatarUrl?:string;coverUrl?:string;actualSubscribers?:number;publicSubscribers?:number;postCount?:number;subscriberDisplayMode?:string;subscriberDisplayValue?:number|null};
type Post={_id:string;channelId:string;title?:string;body?:string;type:string;status:string;actualViews?:number;displayViews?:number;viewDisplayMode?:string;viewDisplayValue?:number|null;publishedAt?:string|null};
const panel:React.CSSProperties={border:"1px solid #263957",background:"#0d1930",borderRadius:20,padding:18};
const field:React.CSSProperties={width:"100%",minHeight:44,border:"1px solid #263957",background:"#071329",color:"#f4f7fc",borderRadius:11,padding:"10px 12px",outline:"none"};
const button:React.CSSProperties={border:0,borderRadius:11,padding:"11px 15px",fontWeight:800,cursor:"pointer",background:"#35d6e3",color:"#04121f"};
const muted:React.CSSProperties={color:"#98a9c2",fontSize:13};
async function api(path:string,method="GET",body?:unknown){
 const response=await fetch(path,{method,credentials:"include",cache:"no-store",headers:{"Content-Type":"application/json"},...(body===undefined?{}:{body:JSON.stringify(body)})});
 const data=await response.json().catch(()=>({}));
 if(!response.ok||data.ok===false)throw new Error(data.error||"Request failed.");
 return data;
}
export default function AdminUpdatesCenter(){
 const [enabled,setEnabled]=useState(false),[notificationsEnabled,setNotificationsEnabled]=useState(true);
 const [channels,setChannels]=useState<Channel[]>([]),[posts,setPosts]=useState<Post[]>([]);
 const [busy,setBusy]=useState(false),[error,setError]=useState(""),[notice,setNotice]=useState("");
 const [tab,setTab]=useState<"channels"|"posts">("channels");
 const [channelId,setChannelId]=useState("");
 const [name,setName]=useState(""),[slug,setSlug]=useState(""),[description,setDescription]=useState(""),[category,setCategory]=useState("General");
 const [avatarUrl,setAvatarUrl]=useState(""),[coverUrl,setCoverUrl]=useState(""),[subscriberMode,setSubscriberMode]=useState("automatic"),[subscriberValue,setSubscriberValue]=useState("1000");
 const [postTitle,setPostTitle]=useState(""),[postBody,setPostBody]=useState(""),[postType,setPostType]=useState("announcement"),[mediaUrls,setMediaUrls]=useState(""),[mediaFiles,setMediaFiles]=useState<File[]>([]),[viewMode,setViewMode]=useState("automatic"),[viewValue,setViewValue]=useState("100");
 const refresh=useCallback(async()=>{
  const [s,c,p]=await Promise.all([api("/api/admin/updates/settings"),api("/api/admin/updates/channels"),api("/api/admin/updates/posts")]);
  setEnabled(s.settings.enabled);setNotificationsEnabled(s.settings.notificationsEnabled);
  setChannels(c.channels||[]);setPosts(p.posts||[]);
  if(!channelId&&c.channels?.length)setChannelId(c.channels[0]._id);
 },[channelId]);
 useEffect(()=>{refresh().catch(e=>setError(e.message));},[refresh]);
 async function run(fn:()=>Promise<void>){setBusy(true);setError("");setNotice("");try{await fn();}catch(e){setError(e instanceof Error?e.message:"Action failed.");}finally{setBusy(false);}}
 async function saveGlobal(next:boolean){await run(async()=>{await api("/api/admin/updates/settings","PATCH",{enabled:next,notificationsEnabled});setEnabled(next);setNotice(next?"Updates is enabled for users.":"Updates is closed for users; channels and memberships are preserved.");await refresh();});}
 async function saveNotifications(next:boolean){await run(async()=>{await api("/api/admin/updates/settings","PATCH",{enabled,notificationsEnabled:next});setNotificationsEnabled(next);setNotice("Updates notification policy saved.");});}
 async function createChannel(){await run(async()=>{const result=await api("/api/admin/updates/channels","POST",{name,slug,description,category,avatarUrl,coverUrl,subscriberDisplayMode:subscriberMode,subscriberDisplayValue:Number(subscriberValue)});setName("");setSlug("");setDescription("");setNotice("Channel created.");setChannelId(result.channel._id);await refresh();});}
 async function channelAction(c:Channel,action:"archive"|"delete"|"activate"|"deactivate"){
  const text=action==="delete"?"Permanently delete this channel, its posts, subscriptions and analytics? This cannot be undone.":action==="archive"?"Archive this channel? It will no longer appear in the public directory.":"Change this channel status?";
  if(!window.confirm(text))return;
  await run(async()=>{if(action==="delete")await api("/api/admin/updates/channels","DELETE",{id:c._id});else await api("/api/admin/updates/channels","PATCH",{id:c._id,status:action==="archive"?"archived":action==="activate"?"active":"inactive"});setNotice("Channel updated.");await refresh();});
 }
 async function updateChannel(c:Channel,patch:Record<string,unknown>){await run(async()=>{await api("/api/admin/updates/channels","PATCH",{id:c._id,...patch});setNotice("Channel settings saved.");await refresh();});}
 async function publish(){await run(async()=>{const media=mediaUrls.split(/\n|,/).map(x=>x.trim()).filter(Boolean).map(url=>({url,type:postType==="video"?"video":"image"}));for(const file of mediaFiles){const form=new FormData();form.set("file",file);const response=await fetch("/api/admin/updates/media",{method:"POST",credentials:"include",body:form});const uploaded=await response.json().catch(()=>({}));if(!response.ok||uploaded.ok!==true)throw new Error(uploaded.error||"Media upload failed.");media.push({url:uploaded.media.url,type:uploaded.media.type});}const result=await api("/api/admin/updates/posts","POST",{channelId,title:postTitle,body:postBody,type:postType,media,status:"published",viewDisplayMode:viewMode,viewDisplayValue:Number(viewValue)});setNotice("Post published. Push delivered to "+(result.notifications?.sent||0)+" device(s).");setPostTitle("");setPostBody("");setMediaUrls("");setMediaFiles([]);await refresh();});}
 async function postAction(p:Post,action:"delete"|"archive"){if(!window.confirm(action==="delete"?"Delete this post and its real view records?":"Archive this post?"))return;await run(async()=>{if(action==="delete")await api("/api/admin/updates/posts","DELETE",{id:p._id});else await api("/api/admin/updates/posts","PATCH",{id:p._id,status:"archived"});setNotice("Post updated.");await refresh();});}
 return <main style={{maxWidth:1100,margin:"0 auto",padding:"26px 16px 80px",color:"#f4f7fc",fontFamily:"Inter,system-ui,sans-serif"}}>
  <header style={{display:"flex",justifyContent:"space-between",gap:14,alignItems:"center",flexWrap:"wrap",marginBottom:22}}><div><div style={{color:"#35d6e3",fontSize:11,fontWeight:900,letterSpacing:2}}>NUMELIXA ADMINISTRATION</div><h1 style={{fontSize:32,margin:"7px 0"}}>Updates Center</h1><p style={muted}>Manage channels, posts, memberships and real engagement metrics.</p></div><button style={{...button,background:"#12213b",color:"#f4f7fc",border:"1px solid #263957"}} onClick={()=>run(refresh)}>Refresh data</button></header>
  {error&&<div role="alert" style={{...panel,borderColor:"#ff647c",color:"#ff9cac",marginBottom:14}}>{error}</div>}
  {notice&&<div role="status" style={{...panel,borderColor:"#35c98a",color:"#8ee7b9",marginBottom:14}}>{notice}</div>}
  <section style={{...panel,marginBottom:18,display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(220px,1fr))",gap:18,alignItems:"center"}}>
   <div><b style={{display:"block",fontSize:17}}>Global Updates system</b><p style={muted}>When closed, user APIs return no channel data and the app removes the Updates destination. Existing content is retained.</p></div>
   <label style={{display:"flex",alignItems:"center",gap:10,fontWeight:800}}><input type="checkbox" checked={enabled} disabled={busy} onChange={e=>saveGlobal(e.target.checked)}/> {enabled?"Enabled":"Closed"}</label>
   <label style={{display:"flex",alignItems:"center",gap:10,fontWeight:800}}><input type="checkbox" checked={notificationsEnabled} disabled={busy} onChange={e=>saveNotifications(e.target.checked)}/> Post notifications</label>
  </section>
  <nav style={{display:"flex",gap:8,marginBottom:16}}><button style={{...button,background:tab==="channels"?"#35d6e3":"#12213b",color:tab==="channels"?"#04121f":"#f4f7fc"}} onClick={()=>setTab("channels")}>Channels ({channels.length})</button><button style={{...button,background:tab==="posts"?"#35d6e3":"#12213b",color:tab==="posts"?"#04121f":"#f4f7fc"}} onClick={()=>setTab("posts")}>Posts ({posts.length})</button></nav>
  {tab==="channels"?<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,340px),1fr))",gap:16}}>
   <section style={panel}><h2 style={{marginTop:0}}>Create channel</h2><div style={{display:"grid",gap:10}}>
    <input style={field} placeholder="Channel name" value={name} onChange={e=>setName(e.target.value)}/>
    <input style={field} placeholder="Unique slug (e.g. numelixa-official)" value={slug} onChange={e=>setSlug(e.target.value)}/>
    <textarea style={{...field,minHeight:90}} placeholder="Description" value={description} onChange={e=>setDescription(e.target.value)}/>
    <input style={field} placeholder="Category" value={category} onChange={e=>setCategory(e.target.value)}/>
    <input style={field} placeholder="Avatar HTTPS image URL" value={avatarUrl} onChange={e=>setAvatarUrl(e.target.value)}/>
    <input style={field} placeholder="Cover HTTPS image URL" value={coverUrl} onChange={e=>setCoverUrl(e.target.value)}/>
    <label style={muted}>Public subscriber display</label><select style={field} value={subscriberMode} onChange={e=>setSubscriberMode(e.target.value)}><option value="automatic">Actual subscribers</option><option value="custom">Custom display value</option></select>
    {subscriberMode==="custom"&&<input style={field} type="number" min="0" step="1" value={subscriberValue} onChange={e=>setSubscriberValue(e.target.value)}/>}
    <button disabled={busy||!name.trim()} style={button} onClick={createChannel}>Create channel</button>
   </div></section>
   <section style={panel}><h2 style={{marginTop:0}}>Manage channels</h2>{channels.length===0?<p style={muted}>No channels have been created yet.</p>:<div style={{display:"grid",gap:10}}>{channels.map(c=><article key={c._id} style={{border:"1px solid #263957",borderRadius:14,padding:13,background:"#071329"}}>
    <div style={{display:"flex",justifyContent:"space-between",gap:8,alignItems:"center"}}><b>{c.name}</b><span style={{fontSize:11,color:c.status==="active"?"#35c98a":"#ffb547"}}>{c.status}</span></div><p style={muted}>/{c.slug} · {c.category} · {c.postCount||0} posts</p>
    <p style={muted}>Actual subscribers: <b style={{color:"#f4f7fc"}}>{c.actualSubscribers||0}</b> · Public display: <b style={{color:"#f4f7fc"}}>{c.publicSubscribers||0}</b> ({c.subscriberDisplayMode==="custom"?"custom":"automatic"})</p>
    <div style={{display:"flex",gap:6,flexWrap:"wrap"}}><button style={{...button,padding:"8px 10px",background:"#12213b",color:"#f4f7fc"}} onClick={()=>{setChannelId(c._id);setTab("posts")}}>Create post</button><button style={{...button,padding:"8px 10px",background:"#12213b",color:"#f4f7fc"}} onClick={()=>updateChannel(c,{verified:!c.verified})}>{c.verified?"Unverify":"Verify"}</button><button style={{...button,padding:"8px 10px",background:"#12213b",color:"#f4f7fc"}} onClick={()=>updateChannel(c,{featured:!c.featured})}>{c.featured?"Unfeature":"Feature"}</button><button style={{...button,padding:"8px 10px",background:"#12213b",color:"#f4f7fc"}} onClick={()=>channelAction(c,c.status==="active"?"deactivate":"activate")}>{c.status==="active"?"Disable":"Activate"}</button><button style={{...button,padding:"8px 10px",background:"#12213b",color:"#f4f7fc"}} onClick={()=>channelAction(c,"archive")}>Archive</button><button style={{...button,padding:"8px 10px",background:"#3b1827",color:"#ff9cac"}} onClick={()=>channelAction(c,"delete")}>Delete</button></div>
   </article>)}</div>}</section>
  </div>:<div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(min(100%,340px),1fr))",gap:16}}>
   <section style={panel}><h2 style={{marginTop:0}}>Publish post</h2><div style={{display:"grid",gap:10}}>
    <select style={field} value={channelId} onChange={e=>setChannelId(e.target.value)}><option value="">Select channel</option>{channels.map(c=><option key={c._id} value={c._id}>{c.name}</option>)}</select>
    <input style={field} placeholder="Post title" value={postTitle} onChange={e=>setPostTitle(e.target.value)}/>
    <select style={field} value={postType} onChange={e=>setPostType(e.target.value)}>{["text","announcement","update","service","maintenance","new-number","image","gallery","video","link","rich"].map(x=><option key={x} value={x}>{x}</option>)}</select>
    <textarea style={{...field,minHeight:150}} placeholder="Write the announcement or update…" value={postBody} onChange={e=>setPostBody(e.target.value)}/>
    {["image","gallery","video"].includes(postType)&&<><label style={muted}>Upload media · PNG, JPEG, WebP, GIF, MP4 or WebM · max 8 MB each</label><input style={field} type="file" accept="image/png,image/jpeg,image/webp,image/gif,video/mp4,video/webm" multiple onChange={e=>setMediaFiles(Array.from(e.target.files||[]))}/>{mediaFiles.length>0&&<p style={muted}>{mediaFiles.length} file(s) selected: {mediaFiles.map(f=>f.name).join(", ")}</p>}<textarea style={{...field,minHeight:70}} placeholder="Optional external HTTPS media URLs (one per line)" value={mediaUrls} onChange={e=>setMediaUrls(e.target.value)}/></>}
    <label style={muted}>Public view display</label><select style={field} value={viewMode} onChange={e=>setViewMode(e.target.value)}><option value="automatic">Actual unique daily views</option><option value="custom">Custom presentation value</option></select>
    {viewMode==="custom"&&<input style={field} type="number" min="0" step="1" value={viewValue} onChange={e=>setViewValue(e.target.value)}/>}
    <button disabled={busy||!channelId||(!postTitle.trim()&&!postBody.trim())} style={button} onClick={publish}>Publish post</button>
   </div></section>
   <section style={panel}><h2 style={{marginTop:0}}>Post analytics & moderation</h2>{posts.length===0?<p style={muted}>No posts yet.</p>:<div style={{display:"grid",gap:10}}>{posts.map(p=><article key={p._id} style={{border:"1px solid #263957",borderRadius:14,padding:13,background:"#071329"}}>
    <b>{p.title||p.type}</b><p style={muted}>{p.status} · {p.type} · {new Date(p.publishedAt||"").toLocaleString()}</p>
    <p style={muted}>Actual unique daily views: <b style={{color:"#f4f7fc"}}>{p.actualViews||0}</b> · Displayed: <b style={{color:"#f4f7fc"}}>{p.displayViews||0}</b> ({p.viewDisplayMode==="custom"?"custom":"automatic"})</p>
    <div style={{display:"flex",gap:8}}><button style={{...button,padding:"8px 10px",background:"#12213b",color:"#f4f7fc"}} onClick={()=>postAction(p,"archive")}>Archive</button><button style={{...button,padding:"8px 10px",background:"#3b1827",color:"#ff9cac"}} onClick={()=>postAction(p,"delete")}>Delete</button></div>
   </article>)}</div>}</section>
  </div>}
  <p style={{...muted,marginTop:18}}>Real subscriber and view metrics are stored separately from public display overrides. Uploaded media is stored in the Updates GridFS bucket with file type and size validation.</p>
 </main>
}
