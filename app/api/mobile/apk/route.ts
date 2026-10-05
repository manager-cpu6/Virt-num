import {NextResponse} from "next/server";
export const runtime="nodejs";
export const dynamic="force-dynamic";
const APK="https://github.com/manager-cpu6/Virt-num/releases/download/android-latest/Numelixa.apk";
export async function GET(){return NextResponse.redirect(APK,302);}
export async function HEAD(){return NextResponse.redirect(APK,302);}
