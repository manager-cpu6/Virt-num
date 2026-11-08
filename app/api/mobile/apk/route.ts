import {NextResponse} from "next/server";
export const runtime="nodejs";
export const dynamic="force-dynamic";
// Keep the browser on Numelixa's own domain. The /android route streams the APK
// from the release origin server-side, so no GitHub host is exposed to users.
const APK="https://www.numelixa.com/android";
export async function GET(){return NextResponse.redirect(APK,302);}
export async function HEAD(){return NextResponse.redirect(APK,302);}
