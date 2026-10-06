import {NextResponse} from "next/server";
import {collection, mongoId} from "@/lib/mongo";
import {check, cancel, finalize} from "@/lib/fivesim";
import {notifyUser} from "@/lib/notifications";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorized(req: Request) {
  const secret = String(process.env.CRON_SECRET || "").trim();
  if (!secret) return false;
  return req.headers.get("authorization") === "Bearer " + secret;
}

async function refundOrder(o: any) {
  const orders = await collection<any>("orders");
  const users = await collection<any>("users");
  const txs = await collection<any>("coinTransactions");
  const changed = await orders.findOneAndUpdate(
    {_id: o._id, userId: o.userId, status: "waiting"},
    {$set: {
      status: "refunded",
      cancelledAt: new Date(),
      refundCoins: Number(o.priceCoins || 0)
    }},
    {returnDocument: "after"}
  );
  if (!changed) return false;

  const refundCoins = Number(o.priceCoins || 0);
  const u = await users.findOneAndUpdate(
    {_id: o.userId},
    {$inc: {coins: refundCoins}},
    {returnDocument: "after"}
  );
  await txs.insertOne({
    _id: mongoId(),
    userId: o.userId,
    type: "refund",
    amount: refundCoins,
    balanceAfter: Number(u?.coins || 0),
    reference: o._id,
    description: "Automatic no-SMS refund",
    createdAt: new Date()
  });
  return true;
}

export async function GET(req: Request) {
  if (!authorized(req)) {
    return NextResponse.json({ok: false, error: "Unauthorized"}, {status: 401});
  }

  const orders = await collection<any>("orders");
  const now = Date.now();
  const waiting = await orders.find({
    status: "waiting",
    expiresAt: {$gt: new Date(now - 60_000)}
  }).sort({createdAt: 1}).limit(100).toArray();

  let checked = 0;
  let received = 0;
  let refunded = 0;
  let warnings = 0;

  for (const o of waiting) {
    try {
      const age = now - new Date(o.createdAt).getTime();

      if (age >= 10 * 60 * 1000) {
        try { await cancel(String(o.providerOrderId)); } catch {}
        if (await refundOrder(o)) {
          refunded++;
          await notifyUser(
            String(o.userId),
            "💸 Order refunded",
            "No SMS arrived within 10 minutes. Your coins have been refunded automatically.",
            {orderId: String(o._id), type: "refund"}
          );
        }
        continue;
      }

      const expiresAt = new Date(o.expiresAt).getTime();
      if (
        expiresAt > now &&
        expiresAt - now <= 120_000 &&
        !o.expiryNotifiedAt
      ) {
        const claimed = await orders.findOneAndUpdate(
          {_id: o._id, status: "waiting", expiryNotifiedAt: {$exists: false}},
          {$set: {expiryNotifiedAt: new Date()}},
          {returnDocument: "after"}
        );
        if (claimed) {
          warnings++;
          await notifyUser(
            String(o.userId),
            "⏳ Number is expiring soon",
            "Your active number is about to expire. Get the SMS before the timer ends.",
            {orderId: String(o._id), type: "expiry"}
          );
        }
      }

      const p = await check(String(o.providerOrderId));
      checked++;

      if (Number(p.status) === 3) {
        const code = String(p.sms || "");
        const fullSms = String((p as any).fullSms || code);
        const changed = await orders.findOneAndUpdate(
          {_id: o._id, userId: o.userId, status: "waiting"},
          {$set: {
            code,
            fullSms,
            status: "received",
            completedAt: new Date()
          }},
          {returnDocument: "after"}
        );
        try { await finalize(String(o.providerOrderId)); } catch {}

        if (changed) {
          received++;
          await notifyUser(
            String(o.userId),
            "🔐 New verification code",
            code
              ? "Your verification code is " + code
              : "A new SMS has arrived. Open Numelixa to view it.",
            {orderId: String(o._id), type: "sms", code}
          );
        }
      } else if (Number(p.status) === 6) {
        if (await refundOrder(o)) {
          refunded++;
          await notifyUser(
            String(o.userId),
            "↩️ Number refunded",
            "The provider cancelled this activation and your coins were refunded.",
            {orderId: String(o._id), type: "refund"}
          );
        }
      }
    } catch (error) {
      console.error("[NOTIFICATION CRON ORDER]", {
        orderId: o?._id,
        message: error instanceof Error ? error.message : String(error)
      });
    }
  }

  return NextResponse.json({ok: true, checked, received, refunded, warnings});
}
