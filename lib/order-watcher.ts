import {collection} from "@/lib/mongo";
import {check,finalize} from "@/lib/sms-provider";
import {notifyUser} from "@/lib/notifications";

const sleep=(ms:number)=>new Promise(resolve=>setTimeout(resolve,ms));

export async function watchOrderForPush(orderId:string,userId:string){
 const orders=await collection<any>("orders");
 const started=Date.now();
 const deadline=started+270_000;

 while(Date.now()<deadline){
  const order=await orders.findOne({_id:orderId,userId,status:"waiting"});
  if(!order)return {status:"stopped"};

  if(new Date(order.expiresAt).getTime()<=Date.now()){
   return {status:"expired"};
  }

  try{
   const result=await check(String(order.providerOrderId),order.provider==="tiger"?"tiger":"5sim");

   if(Number(result.status)===3){
    const code=String(result.sms||"");
    const fullSms=String((result as any).fullSms||code);
    const changed=await orders.findOneAndUpdate(
     {_id:orderId,userId,status:"waiting"},
     {$set:{
      code,
      fullSms,
      status:"received",
      completedAt:new Date(),
      codeNotifiedAt:new Date()
     }},
     {returnDocument:"after"}
    );

    if(changed){
     try{await finalize(String(order.providerOrderId),order.provider==="tiger"?"tiger":"5sim")}catch(error){
      console.error("[ORDER WATCHER FINALIZE]",error);
     }
     await notifyUser(
      userId,
      "🔐 New verification code",
      code
       ? "Your verification code is "+code
       : "A new SMS has arrived. Open Numelixa to view it.",
      {orderId,type:"sms",code}
     );
    }
    return {status:"received",code};
   }

   if(Number(result.status)===6)return {status:"cancelled"};
  }catch(error){
   console.error("[ORDER WATCHER CHECK]",{
    orderId,
    message:error instanceof Error?error.message:String(error)
   });
  }

  await sleep(4000);
 }

 return {status:"timeout"};
}
