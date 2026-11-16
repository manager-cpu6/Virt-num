import {requireAdmin} from "@/lib/auth";import {redirect} from "next/navigation";import AdminReferrals from "@/components/AdminReferrals";
export const dynamic="force-dynamic";
export default async function AdminReferralsPage(){try{await requireAdmin();return <AdminReferrals/>}catch{redirect("/login?next=/admin/referrals")}}
