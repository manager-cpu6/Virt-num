import {requireAdmin} from "@/lib/auth";import {redirect} from "next/navigation";import AdminUserDetail from "@/components/AdminUserDetail";
export const dynamic="force-dynamic";
export default async function AdminUserPage({params}:{params:Promise<{id:string}>}){try{await requireAdmin();const {id}=await params;return <AdminUserDetail id={id}/>}catch{redirect("/login?next=/admin")}}
