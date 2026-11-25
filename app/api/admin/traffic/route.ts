import {NextResponse} from "next/server";
import {requireAdmin} from "@/lib/auth";
import {collection} from "@/lib/mongo";

export const runtime="nodejs";
export const dynamic="force-dynamic";

export async function GET(){
  try{
    await requireAdmin();
    const events=await collection<any>("analyticsEvents");
    const since=new Date(Date.now()-30*24*60*60*1000);
    const match={createdAt:{$gte:since},event:{$in:["pageview","click"]}};
    const pageMatch={createdAt:{$gte:since},event:"pageview"};
    const [totals,sources,pages,countries,cities]=await Promise.all([
      events.aggregate([
        {$match:match},
        {$group:{_id:"$event",count:{$sum:1},visitors:{$addToSet:"$visitorId"}}}
      ]).toArray(),
      events.aggregate([
        {$match:match},
        {$group:{
          _id:{$ifNull:["$source","direct"]},
          pageViews:{$sum:{$cond:[{$eq:["$event","pageview"]},1,0]}},
          clicks:{$sum:{$cond:[{$eq:["$event","click"]},1,0]}},
          visitors:{$addToSet:"$visitorId"},
          lastActivity:{$max:"$createdAt"}
        }},
        {$project:{source:"$_id",pageViews:1,clicks:1,uniqueVisitors:{$size:"$visitors"},lastActivity:1,_id:0}},
        {$sort:{clicks:-1,pageViews:-1}},
        {$limit:50}
      ]).toArray(),
      events.aggregate([
        {$match:pageMatch},
        {$group:{_id:"$path",views:{$sum:1}}},
        {$sort:{views:-1}},
        {$limit:12}
      ]).toArray(),
      events.aggregate([
        {$match:pageMatch},
        {$group:{
          _id:{code:{$ifNull:["$countryCode",""]},name:{$ifNull:["$country","Unknown"]}},
          visitors:{$addToSet:"$visitorId"},
          visits:{$sum:1},
          lastSeen:{$max:"$createdAt"}
        }},
        {$project:{country:"$_id.name",countryCode:"$_id.code",uniqueVisitors:{$size:"$visitors"},visits:1,lastSeen:1,_id:0}},
        {$sort:{uniqueVisitors:-1,visits:-1}},
        {$limit:100}
      ]).toArray(),
      events.aggregate([
        {$match:pageMatch},
        {$group:{
          _id:{city:{$ifNull:["$city","Unknown"]},country:{$ifNull:["$country","Unknown"]},countryCode:{$ifNull:["$countryCode",""]}},
          visitors:{$addToSet:"$visitorId"},
          visits:{$sum:1},
          lastSeen:{$max:"$createdAt"}
        }},
        {$project:{city:"$_id.city",country:"$_id.country",countryCode:"$_id.countryCode",uniqueVisitors:{$size:"$visitors"},visits:1,lastSeen:1,_id:0}},
        {$sort:{uniqueVisitors:-1,visits:-1}},
        {$limit:100}
      ]).toArray()
    ]);
    const pageViews=Number(totals.find((x:any)=>x._id==="pageview")?.count||0);
    const clicks=Number(totals.find((x:any)=>x._id==="click")?.count||0);
    const uniqueVisitors=new Set(totals.flatMap((x:any)=>x.visitors||[])).size;
    return NextResponse.json({
      ok:true,periodDays:30,pageViews,clicks,uniqueVisitors,
      countries:countries.map((x:any)=>({...x,lastSeen:x.lastSeen?.toISOString?.()||null})),
      cities:cities.map((x:any)=>({...x,lastSeen:x.lastSeen?.toISOString?.()||null})),
      sources:sources.map((x:any)=>({...x,lastActivity:x.lastActivity?.toISOString?.()||null})),
      pages:pages.map((x:any)=>({path:String(x._id||"/"),views:Number(x.views||0)}))
    },{headers:{"Cache-Control":"no-store"}});
  }catch(e){
    return NextResponse.json({ok:false,error:e instanceof Error?e.message:"Unable to load traffic analytics"},{status:401});
  }
}
