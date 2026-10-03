import AdminPanel from "@/components/AdminPanel";import {requireAdmin} from "@/lib/auth";import {redirect} from "next/navigation";
export const dynamic="force-dynamic";
export default async function AdminPage(){try{await requireAdmin();return <AdminPanel/>}catch(e){if(e instanceof Error&&e.message==="AUTH_REQUIRED")redirect("/login?next=/admin");return <div className="helper-card"><b>Admin access required</b><span>The signed-in account does not have administrator access.</span></div>}}
