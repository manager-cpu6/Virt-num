import {redirect} from "next/navigation";

/** Unknown website paths return visitors to the sign-in entry point. */
export default function NotFound(){
  redirect("/login");
}
