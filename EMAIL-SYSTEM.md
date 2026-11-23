# Numelixa transactional email system

The transactional email implementation lives in `lib/email-system.ts` and uses the existing SMTP transport in `lib/mailer.ts`. It does not introduce a second provider or change existing authentication/payment APIs.

## Official sender routing

| Event | From | Display name |
|---|---|---|
| OTP, email verification, number ready, received SMS, new-device login | `noreplay@numelixa.com` | Numelixa |
| Welcome | `welcome@numelixa.com` | Numelixa Welcome |
| Password reset and reset confirmation | `forgot@numelixa.com` | Numelixa Account Security |
| Payment receipt, wallet deposit, payment failure | `payment@numelixa.com` | Numelixa Payments |
| Withdrawal request, approval, rejection | `request@numelixa.com` | Numelixa Withdrawals |

All transactional templates use the actual `public/numelixa-app-icon.webp` logo and show `support@numelixa.com` plus the support-center link in the footer. Reply-To is `support@numelixa.com`.

The spelling `noreplay@numelixa.com` is intentional and must not be changed to `noreply`.

## SMTP environment configuration

The current Spacemail SMTP transport is reused. Existing shared credentials remain supported:

- `SPACEMAIL_SMTP_HOST`
- `SPACEMAIL_SMTP_PORT`
- `SPACEMAIL_SMTP_USER`
- `SPACEMAIL_SMTP_PASSWORD`

Each sender can optionally have a dedicated authenticated mailbox. Configure the corresponding prefix with `_HOST`, `_PORT`, `_USER`, `_PASSWORD`, and `_FROM`:

- `SPACEMAIL_NOREPLAY_*` → `noreplay@numelixa.com`
- `SPACEMAIL_WELCOME_*` → `welcome@numelixa.com`
- `SPACEMAIL_FORGOT_*` → `forgot@numelixa.com`
- `SPACEMAIL_PAYMENT_*` → `payment@numelixa.com`
- `SPACEMAIL_WITHDRAWAL_*` → `request@numelixa.com`

Do not put SMTP passwords or provider credentials in Git. The provider must authorize each From identity (or the shared authenticated mailbox must be configured to send as that identity) before production delivery can be considered verified.

## Test-only recipient lock

Set `EMAIL_TEST_MODE=true` and `EMAIL_TEST_RECIPIENT=verified-test-address@example.com` to restrict transactional sends to that one recipient while testing. Remove/disable test mode only after sender identities and DNS authentication have been verified.

## Implemented event hooks

- Signup OTP and email verification
- Welcome after successful email verification
- Password reset and password-reset confirmation
- New-device login alert (device fingerprint changes)
- Number assigned after the order is durably saved
- SMS code after the provider reports the received-SMS status, sent only to the owner of that order
- Wallet-deposit confirmations for PayPal, local Sifalo, NOWPayments and Binance deposits
- Ethiopia incoming-SMS payment receipt
- Verified failed-payment notifications for Sifalo and NOWPayments
- Referral withdrawal request, approval and rejection

The withdrawal-completed template is present, but the current referral admin workflow has no confirmed-disbursement action. It must not send a completed notice merely when a request is approved; connect it only to a future admin action that records that funds were actually sent.

## Delivery and idempotency

`sendTransactionalEmail` validates recipient addresses and HTTPS Numelixa URLs, escapes dynamic HTML values, and uses a per-event idempotency key when supplied. A duplicate event is not sent twice. Failed sends remove the pending event record so a later retry can try again.

Build/deployment and live mailbox delivery still need verification in the target Vercel environment. A Git commit alone does not prove SMTP credentials, sender authorization, SPF, DKIM or DMARC are correctly configured.
