# Numelixa Developer API v1

Base URL: `https://numelixa.com/api/v1`

Numelixa provides a REST/JSON API for developers building bots, websites, automation and applications around virtual-number activations.

## Authentication

Use the production API key from your Numelixa Developer account:

```http
Authorization: Bearer nx_live_YOUR_SECRET_KEY
```

You may also send:

```http
X-API-Key: nx_live_YOUR_SECRET_KEY
```

Never expose an API key in browser JavaScript, Android/iOS source code or public repositories.

## API design

- JSON request and response bodies.
- All resources are scoped to the authenticated account.
- Wallet balance is charged only for a successful activation.
- Public API responses never expose internal network/provider identity, credentials or internal routing choices.
- Number routing and network selection are managed automatically by Numelixa.
- Use the returned order ID for all later SMS, status and cancellation operations.
- Stock and prices are live and can change between requests.
- Catalog/stock responses are optimized for low-latency access; clients should still cache their own UI data briefly and refresh before a purchase.
- Use reasonable polling intervals for SMS instead of sending continuous requests.

## 1. Account

### GET /account

Returns account and wallet information.

```bash
curl "https://numelixa.com/api/v1/account" \
  -H "Authorization: Bearer nx_live_YOUR_SECRET_KEY"
```

Example:

```json
{
  "ok": true,
  "account": {
    "id": "USER_ID",
    "email": "user@example.com",
    "name": "Example User",
    "verified": true,
    "balance": 850,
    "currency": "coins"
  }
}
```

### GET /balance

Returns the current wallet balance.

### GET /transactions

Returns recent wallet ledger entries for the authenticated account.

## 2. Services

### GET /services

Returns the services currently available for number activation.

```bash
curl "https://numelixa.com/api/v1/services" \
  -H "Authorization: Bearer nx_live_YOUR_SECRET_KEY"
```

## 3. Countries and prices

### GET /countries?service=whatsapp

Returns supported countries, live availability and the Numelixa selling price.

```bash
curl "https://numelixa.com/api/v1/countries?service=whatsapp" \
  -H "Authorization: Bearer nx_live_YOUR_SECRET_KEY"
```

Country objects include fields such as:

- `id` — Numelixa country identifier.
- `name` — display name.
- `iso` — ISO country code when available.
- `stock.count` — current available quantity.
- `stock.sellCoins` — amount charged from the wallet.

Do not calculate a purchase price from a stale country response. Refresh the stock/price before purchasing.

## 4. Live stock

### GET /stock?country=usa&service=whatsapp

Checks live availability and the current Numelixa price.

```bash
curl "https://numelixa.com/api/v1/stock?country=usa&service=whatsapp" \
  -H "Authorization: Bearer nx_live_YOUR_SECRET_KEY"
```

Example:

```json
{
  "ok": true,
  "stock": {
    "available": true,
    "count": 12,
    "country": "usa",
    "service": "whatsapp",
    "price": 85,
    "currency": "USD"
  }
}
```

## 5. Purchase a number

### POST /orders

Required JSON:

```json
{
  "country": "usa",
  "service": "whatsapp"
}
```

```bash
curl -X POST "https://numelixa.com/api/v1/orders" \
  -H "Authorization: Bearer nx_live_YOUR_SECRET_KEY" \
  -H "Content-Type: application/json" \
  -d '{"country":"usa","service":"whatsapp"}'
```

The public API does not accept or expose upstream routing/operator selection. Numelixa selects the appropriate available network automatically.

Successful response:

```json
{
  "ok": true,
  "order": {
    "id": "ORDER_ID",
    "number": "+15551234567",
    "price": 85,
    "expiresIn": 600,
    "stockAfter": 11
  }
}
```

The API validates live stock and price immediately before charging the wallet. If the activation cannot be completed safely, the wallet debit is reversed when cancellation is confirmed.

## 6. Orders

### GET /orders

Lists recent orders belonging to the authenticated account.

Optional query:

- `limit` — 1 to 100, default 25.
- `status` — filter by an order status.

```bash
curl "https://numelixa.com/api/v1/orders?limit=25&status=waiting" \
  -H "Authorization: Bearer nx_live_YOUR_SECRET_KEY"
```

### GET /orders/:id

Returns one order.

```bash
curl "https://numelixa.com/api/v1/orders/ORDER_ID" \
  -H "Authorization: Bearer nx_live_YOUR_SECRET_KEY"
```

The response includes the order number, service, country, price, status, SMS/code when available, creation time and expiry time.

## 7. Retrieve SMS/code

### POST /orders/code

Request:

```json
{
  "orderId": "ORDER_ID"
}
```

```bash
curl -X POST "https://numelixa.com/api/v1/orders/code" \
  -H "Authorization: Bearer nx_live_YOUR_SECRET_KEY" \
  -H "Content-Type: application/json" \
  -d '{"orderId":"ORDER_ID"}'
```

For automation, poll at a reasonable interval with backoff and stop polling when the order is completed, cancelled or expired.

## 8. Cancel an activation

### POST /orders/cancel

Only eligible waiting orders can be cancelled.

```bash
curl -X POST "https://numelixa.com/api/v1/orders/cancel" \
  -H "Authorization: Bearer nx_live_YOUR_SECRET_KEY" \
  -H "Content-Type: application/json" \
  -d '{"orderId":"ORDER_ID"}'
```

Successful response:

```json
{
  "ok": true,
  "status": "cancelled",
  "refundedCoins": 85
}
```

Cancellation is account-scoped. A key cannot cancel another account's order.

## 9. JavaScript / Node.js

```js
const API = "https://numelixa.com/api/v1";
const KEY = process.env.NUMELIXA_API_KEY;

async function api(path, options = {}) {
  const response = await fetch(API + path, {
    ...options,
    headers: {
      Authorization: "Bearer " + KEY,
      "Content-Type": "application/json",
      ...(options.headers || {})
    }
  });

  const data = await response.json();
  if (!response.ok) {
    throw new Error(data.error || "Numelixa API error");
  }
  return data;
}

const account = await api("/account");
const stock = await api("/stock?country=usa&service=whatsapp");

if (!stock.stock.available) {
  throw new Error("Out of stock");
}

if (stock.stock.price > account.account.balance) {
  throw new Error("Insufficient balance");
}

const order = await api("/orders", {
  method: "POST",
  body: JSON.stringify({
    country: "usa",
    service: "whatsapp"
  })
});

console.log(order.order.id, order.order.number);
```

## 10. Python

```python
import os
import requests

API = "https://numelixa.com/api/v1"
HEADERS = {
    "Authorization": "Bearer " + os.environ["NUMELIXA_API_KEY"],
    "Content-Type": "application/json",
}

def api(method, path, **kwargs):
    response = requests.request(
        method,
        API + path,
        headers=HEADERS,
        timeout=15,
        **kwargs,
    )
    data = response.json()
    if not response.ok:
        raise RuntimeError(data.get("error", "Numelixa API error"))
    return data

account = api("GET", "/account")
stock = api("GET", "/stock?country=usa&service=whatsapp")

if not stock["stock"]["available"]:
    raise RuntimeError("Out of stock")

if stock["stock"]["price"] > account["account"]["balance"]:
    raise RuntimeError("Insufficient balance")

order = api(
    "POST",
    "/orders",
    json={"country": "usa", "service": "whatsapp"},
)

print(order["order"]["id"], order["order"]["number"])
```

## 11. HTTP status codes

| Status | Meaning |
|---|---|
| 200 | Request completed successfully |
| 400 | Invalid or missing parameters |
| 401 | Missing or invalid API key |
| 402 | Insufficient wallet balance |
| 403 | Account action requires email verification |
| 404 | Resource/order not found |
| 409 | Stock, price or order-state conflict |
| 502 | Temporary upstream number-service failure |
| 503 | Number service temporarily unavailable |

Error bodies use:

```json
{
  "ok": false,
  "error": "Human-readable error message"
}
```

## 12. Production integration rules

1. Keep the API key on your server.
2. Never expose the key to end users.
3. Refresh stock before a purchase.
4. Treat the purchase response as authoritative for the new order.
5. Save the returned order ID immediately.
6. Poll SMS with backoff rather than a tight loop.
7. Stop polling after completion/cancellation/expiry.
8. Handle 401 by rotating/re-authenticating the API key.
9. Handle 409 by refreshing stock and retrying only when appropriate.
10. Do not retry a purchase blindly after a network timeout until you check the order list/status, because a purchase may already have succeeded.
11. Use cancellation only for orders that are still eligible.
12. Never rely on undocumented fields.

## 13. API key security

API keys can be revoked and replaced from the Numelixa Developer dashboard. A revoked key must no longer be used.

Numelixa's public API contract intentionally hides internal number-network identity, routing configuration, credentials and upstream implementation details.
