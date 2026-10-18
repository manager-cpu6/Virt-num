import {NextResponse} from "next/server";
export const runtime="nodejs";
export const dynamic="force-dynamic";
const APK="https://apk.numelixa.com";
export async function GET(){return NextResponse.redirect(APK,302);}
export async function HEAD(){return NextResponse.redirect(APK,302);}
