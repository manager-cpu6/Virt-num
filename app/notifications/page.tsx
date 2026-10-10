import {redirect} from "next/navigation";

// Numelixa uses native FCM push alerts rather than a simulated in-app inbox.
export default function NotificationsPage(){
 redirect("/account");
}
