import Link from "next/link";
import TopBar from "@/components/TopBar";
import ServiceCard from "@/components/ServiceCard";
import { services } from "@/lib/data";
export default function ServicesPage(){return <div><TopBar title="Services" back/><div className="page-intro"><span className="eyebrow">ALL SERVICES</span><h1>Pick a service</h1><p>Availability and pricing are controlled by provider and admin rules.</p></div><div className="service-grid">{services.map(s=><ServiceCard key={s.id} service={s}/>)}</div><div className="notice"><span>✓</span><p>Use numbers only for legitimate accounts, testing and business workflows. Third-party service rules still apply.</p></div><Link href="/admin" className="admin-link">Admin preview →</Link></div>}
