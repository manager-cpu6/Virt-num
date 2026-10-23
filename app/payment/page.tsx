import {headers} from "next/headers";
import FirstPartyCheckout from "@/components/FirstPartyCheckout";
import CryptoPaymentPage from "@/components/CryptoPaymentPage";

export const dynamic = "force-dynamic";

export default async function PaymentPageRoute(){
  const host=(await headers()).get("host")?.split(":")[0].toLowerCase()||"";
  // Some production domain routing sends payment.numelixa.com directly to /payment.
  // Resolve checkout by host here too, so it can never fall through to crypto-only checkout.
  if(host==="checkout.numelixa.com") return <FirstPartyCheckout/>;
  if(host==="payment.numelixa.com") return <CryptoPaymentPage/>;
  return <CryptoPaymentPage/>;
}
