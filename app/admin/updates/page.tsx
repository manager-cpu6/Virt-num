import {requireAdmin} from "@/lib/auth";
import {redirect} from "next/navigation";
import AdminUpdatesCenter from "@/components/AdminUpdatesCenter";
export const dynamic="force-dynamic";
export default async function AdminUpdatesPage(){
 try{await requireAdmin();return <AdminUpdatesCenter/>}
 catch(error){if(error instanceof Error&&error.message==="AUTH_REQUIRED")redirect("/login?next=/admin/updates");return <main style={{maxWidth:760,margin:"60px auto",padding:24,color:"#f4f7fc"}}><h1>Administrator access required</h1><p>This area is restricted to authorized Numelixa administrators.</p></main>}
}
