import {getDemoCode} from "@/lib/store";
export async function POST(request:Request){try{const body=await request.json();const id=String(body.orderId||"");if(!id)return Response.json({ok:false,error:"orderId is required"},{status:400});return Response.json({ok:true,...await getDemoCode(id)})}catch{return Response.json({ok:false,error:"Could not read code"},{status:400})}}
