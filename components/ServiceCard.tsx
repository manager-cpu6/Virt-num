import Link from "next/link";
import type {Service} from "@/lib/data";
export default function ServiceCard({service}:{service:Service}){return <Link className="service-card" href={`/countries?service=${encodeURIComponent(service.name)}`}><span className="service-icon">{service.icon}</span><div><b>{service.name}</b><small>{service.available.toLocaleString()} available</small></div><span className="chevron">›</span></Link>}
