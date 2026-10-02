import {createDemoOrder} from "@/lib/store";
export async function POST(request:Request){try{const body=await request.json();const order=await createDemoOrder(String(body.service||"WhatsApp"),String(body.country||"US"));return Response.json({ok:true,order})}catch{return Response.json({ok:false,error:"Could not create order"},{status:400})}}
