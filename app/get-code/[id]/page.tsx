import TopBar from "@/components/TopBar";import CodeClient from "@/components/CodeClient";import {collection} from "@/lib/mongo";import {getUser} from "@/lib/auth";import {notFound} from "next/navigation";
export const dynamic="force-dynamic";
export default async function CodePage({params}:{params:Promise<{id:string}>}){
 const {id}=await params,u=await getUser();if(!u)notFound();
 const o=await (await collection<any>("orders")).findOne({_id:id,userId:u.id},{projection:{_id:1,service:1,country:1,phoneNumber:1,status:1,expiresAt:1,provider:1,createdAt:1,cancelAvailableAt:1}});
 if(!o)notFound();
 return <div>
   <TopBar title="Get code" back/>
   <div className="code-card live-code-card">
     <CodeClient orderId={String(o._id)} phoneNumber={String(o.phoneNumber||"")} service={String(o.service||"")} country={String(o.country||"")} provider={String(o.provider||"5sim")} createdAt={new Date(o.createdAt||Date.now()).toISOString()} cancelAvailableAt={o.cancelAvailableAt?new Date(o.cancelAvailableAt).toISOString():undefined}/>
   </div>
 </div>
}