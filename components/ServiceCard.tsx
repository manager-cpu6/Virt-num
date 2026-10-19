import Link from "next/link";
import type {Service} from "@/lib/data";
import ServiceLogo from "@/components/ServiceLogo";
export default function ServiceCard({service}:{service:Service}){return <Link className="service-card" href={`/countries?service=${encodeURIComponent(service.name)}`}><ServiceLogo id={service.id} name={service.name}/><div><b>{service.name}</b><small>{service.available.toLocaleString()} available</small></div><span className="chevron">›</span></Link>}
