# Numelixa API v1

Base URL: https://numelixa.com/api/v1

Authentication: Authorization: Bearer NX_API_KEY

## Catalog
GET /services
GET /countries?service=whatsapp
GET /stock?country=us&service=whatsapp&operator=any

## Orders
POST /orders
GET /orders/:id
POST /orders/code
POST /orders/cancel

Order body: {"countryCode":"us","service":"whatsapp","operator":"any"}

## Account
GET /account
GET /transactions

All API orders use the authenticated user's Numelixa wallet. Provider credentials are never exposed to API users.

## Security
Keys are stored as SHA-256 hashes. Rotate or revoke keys from the Numelixa Developer dashboard.
