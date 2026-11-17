"use client";

import { useEffect, useState } from "react";

type Transfer = {
  id: string;
  recipientName: string;
  recipientEmail: string;
  recipientPublicId: string;
  amountUsd: number;
  status: string;
  heldAmountUsd: number;
  createdAt: string;
};

export default function MerchantDashboard() {
  const [balance, setBalance] = useState(0);
  const [rate, setRate] = useState(100);
  const [loaded, setLoaded] = useState(false);
  const [rows, setRows] = useState<Transfer[]>([]);
  const [recipient, setRecipient] = useState("");
  const [amount, setAmount] = useState("5.00");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");

  async function load() {
    try {
      const [meResponse, transferResponse] = await Promise.all([
        fetch("/api/me", { cache: "no-store" }),
        fetch("/api/merchant/transfers", { cache: "no-store" }),
      ]);
      const me = await meResponse.json();
      const transferData = await transferResponse.json();
      setBalance(Number(me.user?.coins || 0));
      setRate(Number(me.pricing?.coinsPerUsd) || 100);
      if (transferData.ok) setRows(transferData.transfers || []);
    } catch {
      setError("Unable to load your Merchant wallet. Please refresh.");
    } finally {
      setLoaded(true);
    }
  }

  useEffect(() => {
    void load();
  }, []);

  async function send(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/merchant/transfers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ recipient, amountUsd: Number(amount), note }),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) {
        setError(data.error || "Transfer failed.");
        return;
      }
      setRecipient("");
      setAmount("5.00");
      setNote("");
      setMessage("Funds sent successfully. The recipient has been notified.");
      await load();
    } catch {
      setError("Unable to complete the transfer. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function control(transfer: Transfer, action: "hold" | "release") {
    const promptText =
      action === "hold"
        ? "Hold the remaining funds from this transfer? The recipient cannot spend held funds."
        : "Release held funds back to the recipient?";
    if (!window.confirm(promptText)) return;

    setBusy(true);
    setError("");
    setMessage("");
    try {
      const response = await fetch("/api/merchant/transfers", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transferId: transfer.id, action }),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) {
        setError(data.error || "Unable to update transfer.");
        return;
      }
      setMessage(action === "hold" ? "Funds held successfully." : "Held funds released.");
      await load();
    } catch {
      setError("Unable to update this transfer. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="nx-wallet-page">
      <div className="nx-wallet-content" style={{ maxWidth: 900, margin: "0 auto", paddingTop: 24 }}>
        <div className="nx-wallet-heading">
          <div>
            <span className="eyebrow">NUMELIXA BUSINESS</span>
            <h1>Merchant</h1>
            <p>Send wallet funds to Numelixa users and manage transfers you funded.</p>
          </div>
          <span className="nx-wallet-lock">Verified access</span>
        </div>

        <section className="nx-wallet-hero">
          <div className="nx-wallet-eyebrow">MERCHANT AVAILABLE BALANCE</div>
          <div className="nx-wallet-balance">{loaded ? "$" + (balance / rate).toFixed(2) : "—"}</div>
          <p>USD · Available to transfer</p>
          <div className="nx-wallet-hero-foot">
            <span>◈ Merchant account</span>
            <span>Secure wallet ledger</span>
          </div>
        </section>

        {error && <div className="nx-checkout-error" role="alert">{error}</div>}
        {message && <div className="nx-wallet-payment-success" role="status">✓ {message}</div>}

        <form onSubmit={send} className="nx-wallet-custom" style={{ marginTop: 20, padding: 22, borderRadius: 22 }}>
          <span className="eyebrow">NEW TRANSFER</span>
          <h2>Send funds</h2>
          <label htmlFor="merchant-recipient">Recipient Numelixa ID or email</label>
          <div>
            <input
              id="merchant-recipient"
              required
              value={recipient}
              onChange={(event) => setRecipient(event.target.value)}
              placeholder="7-digit ID or email address"
            />
          </div>
          <label htmlFor="merchant-amount">Amount (USD)</label>
          <div>
            <span>$</span>
            <input
              id="merchant-amount"
              required
              type="number"
              inputMode="decimal"
              min="0.01"
              step="0.01"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
            />
            <small>USD</small>
          </div>
          <label htmlFor="merchant-note">Transfer note (optional)</label>
          <div>
            <input
              id="merchant-note"
              maxLength={160}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="Reason for this payment"
            />
          </div>
          <p>
            Recipient receives the amount directly in their available Numelixa wallet.
            Your Merchant wallet is debited at the same time.
          </p>
          <button
            type="submit"
            disabled={busy || !loaded || !recipient.trim() || !Number.isFinite(Number(amount)) || Number(amount) <= 0}
          >
            {busy ? "Processing…" : "Send funds securely →"}
          </button>
        </form>

        <section style={{ marginTop: 28 }}>
          <div className="nx-wallet-heading">
            <div>
              <span className="eyebrow">ACTIVITY</span>
              <h2>Transfer history</h2>
            </div>
          </div>
          <div style={{ display: "grid", gap: 12 }}>
            {rows.map((transfer) => (
              <article key={transfer.id} className="nx-wallet-custom" style={{ padding: 18, borderRadius: 18 }}>
                <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
                  <div>
                    <b>{transfer.recipientName || "Numelixa user"}</b>
                    <p>{transfer.recipientEmail || "ID " + transfer.recipientPublicId}</p>
                    <small>{new Date(transfer.createdAt).toLocaleString()}</small>
                  </div>
                  <div style={{ textAlign: "right" }}>
                    <b>{"$" + Number(transfer.amountUsd).toFixed(2)}</b>
                    <p>{transfer.status === "held" ? "Held" : "Completed"}</p>
                    {transfer.heldAmountUsd > 0 && <small>{"Held $" + Number(transfer.heldAmountUsd).toFixed(2)}</small>}
                  </div>
                </div>
                <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                  {transfer.status !== "held" && (
                    <button type="button" className="secondary-btn" disabled={busy} onClick={() => control(transfer, "hold")}>
                      Hold remaining funds
                    </button>
                  )}
                  {transfer.heldAmountUsd > 0 && (
                    <button type="button" className="primary-btn" disabled={busy} onClick={() => control(transfer, "release")}>
                      Release held funds
                    </button>
                  )}
                </div>
              </article>
            ))}
            {loaded && rows.length === 0 && <div className="admin-card">No Merchant transfers yet.</div>}
          </div>
        </section>
      </div>
    </main>
  );
}
