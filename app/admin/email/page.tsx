import {requireAdmin} from "@/lib/auth";
import {redirect} from "next/navigation";
import AdminBulkEmail from "@/components/AdminBulkEmail";
export const dynamic="force-dynamic";
export default async function AdminEmailPage(){try{await requireAdmin();return <AdminBulkEmail/>}catch(e){if(e instanceof Error&&e.message==="AUTH_REQUIRED")redirect("/login?next=/admin/email");return <div style={{padding:30,color:"white"}}>Admin access required.</div>}}
