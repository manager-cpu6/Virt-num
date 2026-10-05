import {NextResponse} from "next/server";
import {collection} from "@/lib/mongo";

export const runtime="nodejs";
export const dynamic="force-dynamic";

export async function GET(){
  try{
    const latest=await (await collection<any>("appUpdates"))
      .findOne({published:true},{sort:{publishedAt:-1},projection:{blobUrl:1}});
    const blobUrl=String(latest?.blobUrl||"").trim();
    if(!blobUrl){
      return new NextResponse("APK is not published yet.",{
        status:404,
        headers:{"Cache-Control":"no-store","Content-Type":"text/plain; charset=utf-8"}
      });
    }

    return NextResponse.redirect(blobUrl,307);
  }catch(error){
    console.error("[APK DOWNLOAD]",error);
    return new NextResponse("APK is temporarily unavailable.",{
      status:503,
      headers:{"Cache-Control":"no-store","Content-Type":"text/plain; charset=utf-8"}
    });
  }
}
