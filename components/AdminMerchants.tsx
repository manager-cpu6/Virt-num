"use client";

import { useEffect, useMemo, useState } from "react";

type MerchantUser = { id: string; name: string; email: string; publicId: string; merchantEnabled: boolean; coins: number };
type HeldTransfer = { id: string; merchantId: string; recipientName: string; recipientEmail: string; amountUsd: number; heldAmountUsd: number; status: string; createdAt: string };

export default function AdminMerchants() {
  const [users, setUsers] = useState<MerchantUser[]>([]);
  const [transfers, setTransfers] = useState<HeldTransfer[]>([]);
  const [coinsPerUsd, setCoinsPerUsd] = useState(100);
  const [query, setQuery] = useState("");
  const [busy, setBusy] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  async function load() {
    try {
      const [ur, tr, sr] = await Promise.all([
        fetch("/api/admin/merchants", { cache: "no-store" }),
        fetch("/api/merchant/transfers", { cache: "no-store" }),
        fetch("/api/admin/stats", { cache: "no-store" }),
      ]);
      const [u, t, s] = await Promise.all([ur.json(), tr.json(), sr.json()]);
      if (u.ok) setUsers(u.users || []); else setError(u.error || "Unable to load Merchant users.");
      if (t.ok) setTransfers(t.transfers || []); else setError(t.error || "Unable to load held transfers.");
      const rate = Number(s.settings?.coinsPerUsd);
      if (s.ok && Number.isFinite(rate) && rate > 0) setCoinsPerUsd(rate);
    } catch { setError("Unable to load Merchant controls. Please refresh."); }
  }
  useEffect(() => { void load(); }, []);

  async function toggle(user: MerchantUser) {
    setBusy(user.id); setError(""); setSuccess("");
    try {
      const response = await fetch("/api/admin/merchants", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: user.id, enabled: !user.merchantEnabled }),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error || "Unable to update Merchant access.");
      setUsers(items => items.map(item => item.id === user.id ? { ...item, merchantEnabled: data.merchantEnabled } : item));
      setSuccess(data.merchantEnabled ? "Merchant access enabled." : "Merchant access disabled.");
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to update Merchant access."); }
    finally { setBusy(""); }
  }

  async function release(transfer: HeldTransfer) {
    if (!window.confirm("Release held funds back to the recipient's available wallet?")) return;
    setBusy(transfer.id); setError(""); setSuccess("");
    try {
      const response = await fetch("/api/merchant/transfers", {
        method: "PATCH", headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ transferId: transfer.id, action: "release" }),
      });
      const data = await response.json();
      if (!response.ok || !data.ok) throw new Error(data.error || "Unable to release held funds.");
      setSuccess("Held funds released successfully."); await load();
    } catch (cause) { setError(cause instanceof Error ? cause.message : "Unable to release held funds."); }
    finally { setBusy(""); }
  }

  const filtered = useMemo(() => users.filter(user =>
    [user.name, user.email, user.publicId].join(" ").toLowerCase().includes(query.toLowerCase())
  ), [users, query]);
  const held = transfers.filter(transfer => transfer.heldAmountUsd > 0);

  return (
    <section className="admin-card" style={{ display: "grid", gap: 18 }}>
      <header>
        <span className="eyebrow">MERCHANT PERMISSIONS</span>
        <h2>Merchant accounts</h2>
        <p>Upgrade selected users to Merchant Account, revoke access, and oversee held wallet funds.</p>
      </header>
      {error && <div className="error-box" role="alert">{error}</div>}
      {success && <div className="success-box" role="status">{success}</div>}
      <div style={{ display: "flex", gap: 12, flexWrap: "wrap", alignItems: "center" }}>
        <input aria-label="Search Merchant users" value={query} onChange={event => setQuery(event.target.value)}
          placeholder="Search name, email or 7-digit Numelixa ID" className="admin-input"
          style={{ flex: "1 1 260px", minWidth: 0 }} />
        <span className="admin-tag">{users.filter(user => user.merchantEnabled).length} active merchants</span>
      </div>
      <div style={{ display: "grid", gap: 10 }}>
        {filtered.map(user => (
          <article key={user.id} style={{
            display: "flex", gap: 14, alignItems: "center", justifyContent: "space-between", flexWrap: "wrap",
            padding: 16, borderRadius: 18,
            background: "linear-gradient(135deg,rgba(28,55,96,.62),rgba(12,27,51,.72))",
            border: "1px solid rgba(130,180,255,.16)",
          }}>
            <div style={{ minWidth: 0, flex: "1 1 220px" }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <b>{user.name || "Numelixa user"}</b>
                <span className="admin-tag">{user.merchantEnabled ? "Merchant Account" : "Personal Account"}</span>
              </div>
              <div style={{ fontSize: 12, opacity: .72, overflowWrap: "anywhere", marginTop: 4 }}>
                {user.email} · ID {user.publicId}
              </div>
              <small>${(user.coins / coinsPerUsd).toFixed(2)} available wallet balance</small>
            </div>
            <button disabled={busy === user.id} onClick={() => void toggle(user)}
              className={user.merchantEnabled ? "secondary-btn" : "primary-btn"}>
              {busy === user.id ? "Saving…" : user.merchantEnabled ? "Disable Merchant" : "Enable Merchant"}
            </button>
          </article>
        ))}
        {filtered.length === 0 && <p>No users match this search.</p>}
      </div>
      <div style={{ borderTop: "1px solid rgba(130,180,255,.14)", paddingTop: 18 }}>
        <div style={{ display: "flex", justifyContent: "space-between", gap: 10, flexWrap: "wrap" }}>
          <div><span className="eyebrow">ADMIN OVERSIGHT</span><h3>Held merchant funds</h3>
            <p>Administrators can release held funds even if the sending Merchant is unavailable.</p></div>
          <span className="admin-tag">{held.length} held transfers</span>
        </div>
        <div style={{ display: "grid", gap: 10, marginTop: 12 }}>
          {held.map(transfer => (
            <article key={transfer.id} style={{
              display: "flex", justifyContent: "space-between", alignItems: "center", gap: 12, flexWrap: "wrap",
              padding: 15, borderRadius: 16, background: "rgba(25,48,85,.48)",
              border: "1px solid rgba(130,180,255,.14)",
            }}>
              <div style={{ minWidth: 0 }}><b>{transfer.recipientName || transfer.recipientEmail || "Recipient"}</b>
                <div style={{ fontSize: 12, opacity: .72, overflowWrap: "anywhere" }}>Merchant ID: {transfer.merchantId}</div>
                <strong>Held ${Number(transfer.heldAmountUsd).toFixed(2)} USD</strong></div>
              <button className="primary-btn" disabled={busy === transfer.id} onClick={() => void release(transfer)}>
                {busy === transfer.id ? "Releasing…" : "Release funds"}
              </button>
            </article>
          ))}
          {held.length === 0 && <p>No held merchant funds.</p>}
        </div>
      </div>
    </section>
  );
}
