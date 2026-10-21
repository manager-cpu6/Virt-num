import {redirect} from "next/navigation";
import {getUser} from "@/lib/auth";
import AdminSupportWorkspace from "@/components/AdminSupportWorkspace";
export const dynamic="force-dynamic";
export default async function AdminSupportPage(){
 const user=await getUser();
 if(!user)redirect("/login?next=/admin/support");
 if(user.role!=="admin"&&user.role!=="support_admin")return <main style={{padding:32,color:"#f5f8ff",background:"#030817",minHeight:"100vh"}}><h1>Support access required</h1><p>This account does not have permission to access the support center.</p></main>;
 return <AdminSupportWorkspace role={String(user.role)}/>;
}
