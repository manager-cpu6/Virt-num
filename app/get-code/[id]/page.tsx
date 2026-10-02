import Link from "next/link";
import TopBar from "@/components/TopBar";
import CodeClient from "@/components/CodeClient";
import { demoOrders } from "@/lib/data";
export default async function CodePage({params}:{params:Promise<{id:string}>}){const {id}=await params;const order=demoOrders.find(x=>x.id===id)||demoOrders[0];return <div><TopBar title="Verification" back/><div className="code-card"><div className="service-badge">{order.flag}</div><span className="eyebrow">{order.service.toUpperCase()}</span><h1>{order.number}</h1><p>Waiting for an SMS from {order.service}. Keep this page open.</p><CodeClient orderId={order.id}/></div><div className="helper-card"><b>Need another number?</b><span>You can purchase as many numbers as your balance allows.</span><Link href="/services">Browse services →</Link></div></div>}
