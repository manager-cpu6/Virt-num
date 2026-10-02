import TopBar from "@/components/TopBar";
import GetNumberClient from "@/components/GetNumberClient";
export default async function GetNumberPage({searchParams}:{searchParams:Promise<{service?:string;country?:string}>}){const p=await searchParams;return <div><TopBar title="Get number" back/><GetNumberClient service={p.service||"WhatsApp"} country={p.country||"US"}/></div>}
