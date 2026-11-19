# Numelixa Developer API v1

This reference is based on the current production route handlers in the website repository. It documents only routes that exist in the repository. Provider-specific metadata and unverified functionality are called out explicitly.

- **Base URL:** `https://www.numelixa.com/api/v1`
- **Transport:** HTTPS
- **Format:** JSON
- **Currency:** USD for public API balances and selling prices

## Quick start

1. Sign in to Numelixa.
2. Open **Developer Center → API Access** at `https://www.numelixa.com/developers`.
3. Copy your production API key. The key is a secret; keep it on a trusted server.
4. Check the service and country catalog, then refresh stock immediately before purchasing.

```bash
export NUMELIXA_API_KEY='nx_live_REPLACE_WITH_YOUR_KEY'
curl --fail-with-body --silent --show-error \
  'https://www.numelixa.com/api/v1/account' \
  -H "Authorization: Bearer $NUMELIXA_API_KEY" \
  -H 'Accept: application/json'
```

## Authentication and API keys

Send the key with every request:

```http
Authorization: Bearer nx_live_YOUR_SECRET_KEY
```

The API also advertises the `X-API-Key` header. The key prefix is `nx_live_`. API keys are created automatically for an account in the Developer Center. The active key can be copied from the authenticated dashboard; revoking the active key automatically creates a replacement. Keep the raw key private and never place it in browser JavaScript, a mobile APK, a public repository, logs or screenshots.

All documented v1 resource handlers call the authenticated-user guard. A missing, invalid or revoked key is rejected; data is scoped to the authenticated account.

## API discovery

### GET /

Returns the v1 API name, version, operational status, authentication description, currency and a list of endpoint paths. This discovery response is informational; use the individual endpoints below for data.

## Account and wallet

### GET /account

Returns account identity and the current USD wallet balance.

Verified response shape:

```json
{
  "ok": true,
  "account": {
    "id": "ACCOUNT_ID",
    "email": "account@example.com",
    "name": "Account name",
    "verified": true,
    "balance": 8.5,
    "currency": "USD"
  }
}
```

Values above are illustrative placeholders; they are not live account data.

### GET /balance

Returns `balance`, `currency` and `accountId`. The balance is expressed in USD.

### GET /transactions

Returns up to 100 most recent wallet ledger entries for the authenticated account. Each returned transaction includes `id`, `type`, `amountUsd`, `balanceAfterUsd`, `currency`, optional `reference`, `description` and `createdAt`. Transaction types are ledger values; do not assume an exhaustive enum beyond values actually returned.

**Funding:** no public v1 wallet-funding endpoint is exposed by the inspected v1 route tree. Use the official checkout UI for funding. A payment provider integration is not a public API funding contract.

## Services, countries and prices

### GET /services

Returns the current configured service catalog in `services`. Use the returned service identifier exactly as provided. Service names and identifiers are supplied by the active catalog and may change.

### GET /countries?service=whatsapp

The `service` query parameter is required. Returns countries associated with that service, including provider-supplied country metadata plus the API's `flag`, `available`, `stock`, `price` and `currency` fields. The `price` is the Numelixa selling price in USD, not an upstream provider cost.

Use the country identifier returned by this endpoint in later calls. The API does not define a separate, guaranteed country calling-code field in its documented response. Use `iso` or other country metadata only when it is present in the returned object.

### GET /stock?country=usa&service=whatsapp

Both query parameters are required. Returns:

```json
{
  "ok": true,
  "stock": {
    "available": true,
    "count": 12,
    "country": "usa",
    "service": "whatsapp",
    "price": 0.85,
    "currency": "USD"
  }
}
```

This example illustrates the verified response keys, not current inventory or pricing. Stock and price are live and may change. Refresh this endpoint immediately before purchase. A zero count or unavailable response means do not attempt to purchase at that moment.

## Number acquisition and order lifecycle

### POST /orders

Creates an activation using the current live price and inventory. JSON body:

```json
{ "country": "usa", "service": "whatsapp" }
```

The backend also accepts `countryCode` for compatibility. Public API clients do not choose an upstream provider or operator.

On success, the v1 wrapper returns an `order` object containing `id`, `number`, `price`, `currency`, `expiresIn` and `stockAfter`. The public `price` is USD. Save the returned order ID immediately.

Purchase requires an eligible verified account, sufficient wallet balance, current stock and a successful upstream activation. The server rechecks price and stock immediately before charging. If the purchase times out, check order history before retrying; do not blindly submit a second purchase.

### GET /orders

Lists the authenticated account's recent orders.

Optional query parameters:
- `limit`: 1–100; default 25.
- `status`: exact order status filter.

Returned order objects include `id`, `service`, `country`, `countryCode`, `phone`, `price`, `currency`, `status`, optional `code` and `fullSms`, `expiresAt`, `createdAt` and optional `completedAt`.

### GET /orders/{orderId}

Returns one order belonging to the authenticated account. The returned order includes `id`, `service`, `country`, `phone`, `price`, `currency`, `status`, optional `code` and `fullSms`, `expiresAt`, `createdAt` and optional `completedAt`.

### POST /orders/code

Checks the upstream activation for a new SMS and returns the current status. JSON body:

```json
{ "orderId": "ORDER_ID" }
```

When a code is received, the response contains `ok`, `code`, `fullSms` and `status: "received"`. While waiting, it returns `status: "waiting"`, an empty `code` and `timeLeft` in seconds. The current server lifecycle checks the 10-minute activation window; after expiry, an eligible no-SMS order is refunded to the Numelixa wallet. The order status and returned response are authoritative.

Treat full SMS bodies and OTPs as sensitive data. Do not log or expose them to other users.

### POST /orders/cancel

JSON body:

```json
{ "orderId": "ORDER_ID" }
```

The current public v1 cancellation handler accepts only orders with `status: "waiting"` and returns a cancellation status and refund amount in USD.

**Provider compatibility limitation:** the current `/api/v1/orders/cancel` route imports the 5SIM cancellation adapter directly rather than the active-provider dispatcher. It must not be assumed to work for TigerSMS-routed orders. Confirm provider routing with the API owner before relying on this endpoint in a TigerSMS configuration. This is a backend limitation, not a client-side workaround.

## Webhooks

Configure a public HTTPS endpoint in **Developer Center → Webhooks**. Current event names verified in the code:

- `order.created`
- `order.code_received`
- `order.cancelled`

The event envelope contains `id`, `type`, `createdAt` and `data`. Headers include:
- `X-Numelixa-Event`
- `X-Numelixa-Event-Id`
- `X-Numelixa-Timestamp`
- `X-Numelixa-Signature: sha256=HEX`

The signature is HMAC-SHA256 over `timestamp + "." + exactRawJsonBody`, using the signing secret shown when the endpoint is first configured. Verify the exact raw request bytes before parsing JSON, compare signatures safely, validate timestamp freshness and deduplicate by event ID.

Delivery is attempted synchronously with a short timeout (5 seconds). The current implementation does **not** automatically retry failed deliveries. Persist events and reconcile order state using the API when necessary. Webhook delivery status is available in the Developer Center.

## Errors and reliability

The route handlers currently expose these common HTTP statuses:

| HTTP status | Meaning |
|---|---|
| 200 | Successful read or action |
| 400 | Missing or invalid input |
| 401 | Missing, invalid or revoked authentication |
| 402 | Insufficient USD wallet balance |
| 403 | Account verification or permission restriction |
| 404 | Account or order not found |
| 409 | Stock unavailable or order state conflict |
| 500 | Internal operation failed |
| 502 / 503 | Temporary upstream or service failure |

A `429` response may be introduced by platform-level throttling, but no numeric quota, reset window or stable rate-limit header is published in the inspected API contract. Do not assume a fixed requests-per-minute value.

Use bounded retries with backoff for safe reads only. Do not blindly retry number acquisition after a timeout. First reconcile through `GET /orders` and `GET /orders/{orderId}`. Treat non-JSON responses and redirects as errors; API requests should not be silently redirected to a browser login page.

## Integration examples

### JavaScript / Node.js

```js
const base = "https://www.numelixa.com/api/v1";
const key = process.env.NUMELIXA_API_KEY;

async function numelixa(path, options = {}) {
  const response = await fetch(base + path, {
    ...options,
    redirect: "manual",
    headers: {
      Authorization: "Bearer " + key,
      Accept: "application/json",
      ...(options.body ? { "Content-Type": "application/json" } : {}),
      ...options.headers,
    },
  });
  if (response.status >= 300 && response.status < 400) {
    throw new Error("Unexpected API redirect");
  }
  const data = await response.json();
  if (!response.ok || data.ok === false) {
    throw new Error(data.error || "Numelixa API request failed");
  }
  return data;
}

const account = await numelixa("/account");
const stock = await numelixa("/stock?country=usa&service=whatsapp");
console.log(account, stock);
// Create an order only after checking stock and obtaining user confirmation.
```

### Python

```python
import os
import requests

BASE = "https://www.numelixa.com/api/v1"
session = requests.Session()
session.headers.update({
    "Authorization": "Bearer " + os.environ["NUMELIXA_API_KEY"],
    "Accept": "application/json",
})

def numelixa(method, path, **kwargs):
    response = session.request(method, BASE + path, timeout=20,
                               allow_redirects=False, **kwargs)
    if 300 <= response.status_code < 400:
        raise RuntimeError("Unexpected API redirect")
    data = response.json()
    if not response.ok or data.get("ok") is False:
        raise RuntimeError(data.get("error", "Numelixa API request failed"))
    return data

account = numelixa("GET", "/account")
stock = numelixa("GET", "/stock?country=usa&service=whatsapp")
print(account, stock)
```

### PHP

```php
<?php
$base = "https://www.numelixa.com/api/v1";
$key = getenv("NUMELIXA_API_KEY");

function numelixa($method, $path, $payload = null) {
    global $base, $key;
    $headers = ["Authorization: Bearer " . $key, "Accept: application/json"];
    if ($payload !== null) $headers[] = "Content-Type: application/json";
    $ch = curl_init($base . $path);
    curl_setopt_array($ch, [
        CURLOPT_RETURNTRANSFER => true,
        CURLOPT_FOLLOWLOCATION => false,
        CURLOPT_CUSTOMREQUEST => $method,
        CURLOPT_HTTPHEADER => $headers,
        CURLOPT_TIMEOUT => 20,
    ]);
    if ($payload !== null) curl_setopt($ch, CURLOPT_POSTFIELDS, json_encode($payload));
    $body = curl_exec($ch);
    $status = curl_getinfo($ch, CURLINFO_HTTP_CODE);
    if ($body === false) throw new RuntimeException(curl_error($ch));
    curl_close($ch);
    if ($status >= 300 && $status < 400) throw new RuntimeException("Unexpected redirect");
    $data = json_decode($body, true, 512, JSON_THROW_ON_ERROR);
    if ($status < 200 || $status >= 300 || ($data["ok"] ?? true) === false)
        throw new RuntimeException($data["error"] ?? "API request failed");
    return $data;
}

$account = numelixa("GET", "/account");
$stock = numelixa("GET", "/stock?country=usa&service=whatsapp");
print_r([$account, $stock]);
```

### cURL

```bash
curl --fail-with-body 'https://www.numelixa.com/api/v1/balance' \
  -H "Authorization: Bearer $NUMELIXA_API_KEY" \
  -H 'Accept: application/json'
```

## Security

- Use HTTPS only.
- Store keys in a server-side secret manager or environment variable.
- Never bundle an API key in a website frontend, Android/iOS app or desktop client.
- Do not log API keys, OTPs or full SMS bodies.
- Verify webhook signatures over the exact raw body.
- Restrict webhook receivers to public HTTPS endpoints and deduplicate event IDs.
- Revoke and replace a key immediately if exposure is suspected.

## Not yet verified / requires owner confirmation

- Numeric API rate limits, quota windows and rate-limit headers.
- A public v1 endpoint for wallet funding or payment initiation.
- A public v1 country calling-code field guaranteed across providers.
- TigerSMS compatibility for the current v1 cancellation endpoint.
- Automatic webhook retries or delivery guarantees.
- A public idempotency-key contract for purchase requests.
- Formal API version deprecation and compatibility policy.
- Public endpoints for account deletion or session/device management.
