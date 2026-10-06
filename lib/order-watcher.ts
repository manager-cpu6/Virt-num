import {collection} from "@/lib/mongo";
import {check,finalize} from "@/lib/fivesim";
import {notifyUser} from "@/lib/notifications";

export async function watchOrderForPush(orderId:string,userId:string){
  const maxChecks=54; // ~4.5 minutes at a 5 second interval
  for(let attempt=0;attempt<maxChecks;attempt++){
    try{
      const orders=await collection<any>("orders");
      const order=await orders.findOne({_id:String(orderId),userId:String(userId),status:"waiting"});
      if(!order)return;
      const age=Date.now()-new Date(order.createdAt||Date.now()).getTime();
      if(age>=9*60*1000)return;

      const result=await check(String(order.providerOrderId));
      if(Number(result.status)===3){
        const code=String(result.sms||"");
        const fullSms=String((result as any).fullSms||code);
        const changed=await orders.findOneAndUpdate(
          {_id:String(orderId),userId:String(userId),status:"waiting"},
          {$set:{code,fullSms,status:"received",completedAt:new Date(),codeNotifiedAt:new Date()}},
          {returnDocument:"after"}
        );
        if(changed){
          try{await finalize(String(order.providerOrderId));}catch{}
          await notifyUser(
            String(userId),
            "🔐 New verification code",
            code?"Your verification code is "+code:"A new SMS has arrived. Open Numelixa to view it.",
            {orderId:String(orderId),type:"sms",code}
          );
        }
        return;
      }
      if(Number(result.status)===6)return;
    }catch(error){
      console.error("[ORDER PUSH WATCH]",{
        orderId,
        attempt,
        message:error instanceof Error?error.message:String(error)
      });
    }
    await new Promise(resolve=>setTimeout(resolve,5000));
  }
}
