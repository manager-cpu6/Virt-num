export async function GET(){return Response.json({ok:true,app:"Numelixa",providerMode:process.env.PROVIDER_MODE||"mock",time:new Date().toISOString()})}
