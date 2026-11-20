# Numelixa website/backend feature-preservation inventory

This is a source-level inventory for the feature branch. Routes and handlers being present in the repository does not prove that external providers, production credentials, DNS, SMTP, Firebase, or live data are healthy. Production runtime verification remains required.

## Website route inventory

| Area | Routes / implementation | Classification |
|---|---|---|
| Public product | /, /services, /countries, /pricing, /mobile-apps, /download, /ios | Existing routes; homepage expanded with live service discovery |
| Auth | /login, /signup, /forgot-password, /reset-password, /verify-email, /login-approval, /auth/native/google | Existing; OAuth/SMTP/device flow requires live verification |
| User workspace | /account, /dashboard, /numbers, /wallet, /notifications, /referrals, /get-code/[id] | Existing; notifications route intentionally redirects to account/native notification entry |
| Payments | /payment-method, /payment, /local-payment, /ethiopia-payment, /ebirr-checkout, /receipt/verify, /wallet/receipt | Existing; live provider status and reconciliation require testing |
| Support | /support, /faq, /clients | Existing support options and content |
| Partners | /partners | Reworked to separate partnership enquiry form |
| Developers | /developers, /developers/docs, /docs | Existing portal and docs; /docs is a route alias to the same docs source |
| Legal | /terms, /privacy, /refunds, /cookies, /acceptable-use, /account-deletion, /legal | Canonical policy routes; old URLs redirect |
| Admin | /admin and its eBIRR, email, local payments, referrals, support, users and Updates sections | Existing admin routes; server authorization remains authoritative |

Legacy policy routes:
- /refund-policy → /refunds
- /cookie-policy → /cookies
- /rules → /acceptable-use

The canonical pages retain the published policy content from the previous routes. No company registration number, licence, office address or new legal guarantee has been invented.

## Footer architecture

- PublicFooter is the shared global footer component.
- AppChrome renders it once after the page main content.
- Developer Portal and documentation no longer render separate local footer components; they use the same shared footer.
- Individual page components no longer import/render PublicFooter.
- The shared footer contains brand, product, clients, partners, developers and legal groups plus the configured support email.
- Auth, checkout and dedicated support hosts keep their host-specific layout behavior.

A source scan of the app page files found no remaining direct PublicFooter imports or inline duplicate footer classes in the scanned routes. Browser verification on each host remains pending.

## Existing API inventory (selected verified route groups)

| Group | Existing route families | Classification |
|---|---|---|
| Auth/profile | /api/auth/*, /api/me, /api/mobile/* | Existing; OAuth, SMTP and session behavior require runtime verification |
| Catalog | /api/catalog/services, /api/catalog/countries, /api/catalog/stock | Existing live provider-backed catalog |
| Orders/SMS | /api/orders, /api/my-orders, /api/orders/code, /api/orders/cancel, /api/v1/orders/* | Existing; provider behavior requires end-to-end tests |
| Wallet/payments | /api/v1/balance, /api/v1/transactions, /api/payments/ethiopia/*, /api/payments/sifalo/*, /api/payments/binance/*, receipt routes | Existing; credentials/webhooks/provider reconciliation require verification |
| Notifications | /api/notifications, /api/notifications/register, notification preferences | Existing FCM contracts; delivery requires live token/config checks |
| Developer | /api/v1/*, /api/developer/keys, /api/developer/webhook | Existing; API key and webhook contracts documented from source |
| Support | /api/support/* and support chat/ticket routes | Existing; agent workflow requires live verification |
| Admin | /api/admin/* | Existing admin-protected handlers |
| Updates | /api/updates/*, /api/admin/updates/* | Added in this feature branch |
| Partner enquiries | /api/partner-inquiries, /api/admin/partner-inquiries | Added in this feature branch |

## Updates backend architecture

The implementation reuses the existing MongoDB database and adds indexes/collections for:
- updateChannels
- updatePosts
- updateSubscriptions
- updateBlocks
- updatePostViews
- update settings stored in the existing settings collection
- GridFS bucket updatesMedia
- partnerInquiries and partnerInquiryRateLimits

The database helper creates the new indexes through its existing initialization path. No production data migration or database switch is performed by this branch.

Security/behavior:
- User routes require authenticated users.
- Admin channel/post/settings/media/member actions require server-side admin authorization.
- Channel slugs and memberships have unique indexes.
- User membership uses upsert and handles duplicate-key races.
- Blocks are per-user and unique per channel.
- Actual post views are unique per user/post/UTC day.
- Actual views/subscribers are stored separately from display overrides.
- Global close returns no public channel data, blocks user channel routes, suppresses new post notifications and gates media delivery; content and membership records are retained.
- Personal hide is stored per user, hides public channel APIs and suppresses notifications without deleting memberships.
- Notifications are sent only to subscribed, unblocked users whose personal Updates preferences allow delivery and whose app notification preference allows it.
- Media upload is admin-only, limited to 8 MB, restricted to PNG/JPEG/WebP/GIF/MP4/WebM, MIME/signature checked and stored in GridFS.
- Media retrieval is limited to files referenced by published posts in active public channels and is disabled when the global Updates system is closed.
- Partner enquiry submissions are validated, honeypot checked, rate-limited by a hashed connection identifier, stored in MongoDB and emailed to the configured support inbox. Admins can review/status them through a protected inbox.

## Developer API documentation review

The public API v1 routes verified from the repository include:
- GET /api/v1/account
- GET /api/v1/balance
- GET /api/v1/transactions
- GET /api/v1/services
- GET /api/v1/countries?service=...
- GET /api/v1/stock?country=...&service=...
- GET /api/v1/orders
- POST /api/v1/orders
- GET /api/v1/orders/[id]
- POST /api/v1/orders/code
- POST /api/v1/orders/cancel

Authentication supports Bearer API keys and X-API-Key. Keys are provisioned by the existing account/developer workflow; no public key-creation endpoint or permission scopes are documented.

Webhooks:
- order.created
- order.code_received
- order.cancelled
- HMAC-SHA256 over timestamp + "." + exact raw JSON body
- X-Numelixa-Event, X-Numelixa-Event-Id, X-Numelixa-Timestamp and X-Numelixa-Signature headers
- five-second timeout and one best-effort attempt; automatic retries are not implemented

No numeric public API rate limit is published. The docs advise safe backoff for reads and reconciliation before retrying a timed-out purchase. Payment creation endpoints are not represented as public API v1 functionality.

A provider-specific cancellation defect in the public v1 cancel handler was identified: it called the 5SIM adapter regardless of the order's stored provider. The feature branch changes it to use the provider recorded on the order. This requires provider integration testing before release.

## Security review findings / verification gaps

- New Updates and partner admin APIs call requireAdmin server-side; client UI is not treated as authorization.
- Webhook delivery uses HTTPS-only endpoint validation, DNS resolution checks, HMAC signatures, manual redirect handling and a five-second timeout. Automatic retry/replay is not implemented.
- API key handling remains server-side and encrypted; keys must not be embedded in mobile/web client bundles.
- Updates media validation is server-side. GridFS media is not cached publicly.
- Partner enquiry rate limiting is stored in MongoDB; high-concurrency abuse testing remains pending.
- Existing payment callbacks, Sifalo, Ethiopia payment SMS matching, Binance deposit verification, SMTP, OAuth and FCM require dedicated production credential tests.
- The existing application contains no published numeric API rate-limit contract.
- No automated backend integration suite was found for all payment/provider flows; these remain runtime verification requirements.

## Build and release verification

- GitHub Actions website lint/typecheck/build has passed on an earlier feature-branch commit. Newer commits must pass the current run before acceptance.
- Vercel preview creation was rejected by the Vercel API with HTTP 402 due to the team's daily deployment limit. No Vercel preview or production deployment is claimed.
- No production branch, production domain, Vercel environment configuration or production database is changed by this feature branch.
