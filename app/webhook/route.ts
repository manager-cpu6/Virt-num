import { createHmac, timingSafeEqual } from "node:crypto";
import { NextRequest, NextResponse } from "next/server";
import { collection } from "@/lib/mongo";
import { finalize } from "@/lib/sms-provider";
import { notifyUser } from "@/lib/notifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const DEFAULT_VERIFY_TOKEN = "Hacker";

export async function GET(request: NextRequest) {
  const url = new URL(request.url);
  const mode = url.searchParams.get("hub.mode");
  const token = url.searchParams.get("hub.verify_token");
  const challenge = url.searchParams.get("hub.challenge");
  const expectedToken =
    process.env.META_WHATSAPP_VERIFY_TOKEN ||
    process.env.WHATSAPP_VERIFY_TOKEN ||
    DEFAULT_VERIFY_TOKEN;

  if (mode === "subscribe" && token === expectedToken && challenge) {
    return new Response(challenge, {
      status: 200,
      headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
    });
  }
  return new Response("Forbidden", {
    status: 403,
    headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
  });
}

function signatureIsValid(rawBody: string, signatureHeader: string | null, secret: string) {
  if (!signatureHeader || !/^([a-f0-9]{64})$/i.test(signatureHeader)) return false;
  const expected = createHmac("sha256", secret).update(rawBody, "utf8").digest();
  let received: Buffer;
  try { received = Buffer.from(signatureHeader, "hex"); } catch { return false; }
  return received.length === expected.length && timingSafeEqual(received, expected);
}

async function handleTigerSmsWebhook(body: any, rawBody: string, request: NextRequest) {
  const secret = String(process.env.TIGER_SMS_WEBHOOK_SECRET || process.env.TIGERSMS_WEBHOOK_SECRET || "").trim();
  if (!secret) {
    console.error("[TIGER WEBHOOK] Missing TIGER_SMS_WEBHOOK_SECRET environment variable.");
    return NextResponse.json({ ok: false, error: "Tiger SMS webhook secret is not configured." }, { status: 503 });
  }
  if (!signatureIsValid(rawBody, request.headers.get("x-signature"), secret)) {
    return NextResponse.json({ ok: false, error: "Invalid Tiger SMS signature." }, { status: 401 });
  }

  const activationId = String(body?.activationId ?? body?.activation_id ?? body?.id ?? "").trim();
  const fullSms = String(body?.text ?? body?.sms ?? body?.code ?? "").trim();
  const suppliedCode = String(body?.code ?? "").trim();
  const extractedCode = fullSms.match(/\b\d{4,8}\b/)?.[0] || "";
  const code = suppliedCode || extractedCode;
  if (!activationId || (!code && !fullSms)) {
    return NextResponse.json({ ok: false, error: "Invalid Tiger SMS webhook payload." }, { status: 400 });
  }

  const orders = await collection<any>("orders");
  const order = await orders.findOne({ provider: "tiger", providerOrderId: activationId });
  if (!order) {
    // Ask Tiger to retry briefly if the provider callback beats order persistence.
    return NextResponse.json({ ok: false, error: "Tiger activation not found." }, { status: 503 });
  }
  if (order.status !== "waiting") {
    // Tiger may retry the same SMS; acknowledge duplicates without overwriting a completed order.
    return NextResponse.json({ ok: true, duplicate: true }, { status: 200 });
  }

  const changed = await orders.findOneAndUpdate(
    { _id: order._id, provider: "tiger", providerOrderId: activationId, status: "waiting" },
    { $set: {
      code: code || fullSms,
      fullSms: fullSms || code,
      status: "received",
      completedAt: new Date(),
      codeNotifiedAt: new Date(),
      tigerWebhookReceivedAt: new Date()
    } },
    { returnDocument: "after" }
  );

  if (changed) {
    try {
      await notifyUser(
        String(order.userId),
        "🔐 New verification code",
        code ? "Your verification code is " + code : "A new SMS has arrived. Open Numelixa to view it.",
        { orderId: String(order._id), type: "sms", code: code || fullSms }
      );
    } catch (error) {
      console.error("[TIGER WEBHOOK NOTIFICATION]", error);
    }
    // Finalization is best-effort: the saved SMS remains available even if Tiger is temporarily down.
    try { await finalize(activationId, "tiger"); }
    catch (error) { console.error("[TIGER WEBHOOK FINALIZE]", error); }
  }

  return NextResponse.json({ ok: true, received: true }, { status: 200 });
}

export async function POST(request: NextRequest) {
  const rawBody = await request.text();
  let body: any;
  try { body = JSON.parse(rawBody); }
  catch { return NextResponse.json({ ok: false, error: "Invalid JSON." }, { status: 400 }); }

  // Tiger SMS sends activationId/service/text/code/country/receivedAt.
  // Keep the existing WhatsApp webhook behavior for non-Tiger events.
  const isTigerPayload = body && typeof body === "object" &&
    (body.activationId !== undefined || body.activation_id !== undefined) &&
    (body.code !== undefined || body.text !== undefined || body.sms !== undefined);
  if (isTigerPayload) {
    try { return await handleTigerSmsWebhook(body, rawBody, request); }
    catch (error) {
      console.error("[TIGER WEBHOOK]", error instanceof Error ? error.message : String(error));
      return NextResponse.json({ ok: false, error: "Tiger SMS webhook processing failed." }, { status: 503 });
    }
  }

  // Existing generic webhook path retained for compatibility with prior integrations.
  console.log("WhatsApp webhook event:", JSON.stringify(body));
  return NextResponse.json({ received: true }, { status: 200 });
}
