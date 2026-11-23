import {collection} from "@/lib/mongo";
export type SystemControl="stopNewUsers"|"stopDeposit"|"stopOrders";
const messages:Record<SystemControl,string>={
 stopNewUsers:"New registrations are temporarily paused. Please try again later.",
 stopDeposit:"Wallet deposits are temporarily unavailable. Please try again later.",
 stopOrders:"Number orders are temporarily paused. Please try again later."
};
export async function getSystemControls(){
 const row=await (await collection<any>("settings")).findOne({_id:"systemMaintenance"});
 return {stopNewUsers:row?.stopNewUsers===true,stopDeposit:row?.stopDeposit===true,stopOrders:row?.stopOrders===true,
  stopNewUsersMessage:String(row?.stopNewUsersMessage||messages.stopNewUsers),
  stopDepositMessage:String(row?.stopDepositMessage||messages.stopDeposit),
  stopOrdersMessage:String(row?.stopOrdersMessage||messages.stopOrders)};
}
export async function systemControlMessage(key:SystemControl){
 const controls=await getSystemControls();
 const flag=controls[key];
 const message=key==="stopNewUsers"?controls.stopNewUsersMessage:key==="stopDeposit"?controls.stopDepositMessage:controls.stopOrdersMessage;
 return flag?message:null;
}
