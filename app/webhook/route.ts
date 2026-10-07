import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");

  const expectedToken =
    process.env.META_WHATSAPP_VERIFY_TOKEN ||
    process.env.WHATSAPP_VERIFY_TOKEN ||
    "";

  if (
    mode === "subscribe" &&
    expectedToken &&
    token === expectedToken &&
    challenge
  ) {
    return new Response(challenge, {
      status: 200,
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Cache-Control": "no-store",
      },
    });
  }

  return new Response("Forbidden", {
    status: 403,
    headers: {
      "Content-Type": "text/plain; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}

export async function POST(request: NextRequest) {
  // WhatsApp Cloud API will send webhook events here after verification.
  // Keep this endpoint available so the GET verification and future event
  // handling use the same /webhook URL.
  try {
    const body = await request.json();
    console.log("WhatsApp webhook event:", JSON.stringify(body));
  } catch {
    // Meta may send an empty/invalid body during connectivity checks.
  }

  return NextResponse.json({ received: true }, { status: 200 });
}
