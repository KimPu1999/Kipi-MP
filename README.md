# Kipi Marketplace

Kipi Marketplace is a React/Vite/Tailwind customer storefront with an Express/TypeScript API foundation and Phase 2 secure authentication/session primitives.

## Run locally

```bash
npm install
npm run dev
```

The frontend runs at `http://localhost:5173`; the API runs at `http://localhost:4000`.

## Current API

- `GET /api/health`
- `GET /api/products`
- `GET /api/products/:id`
- `GET /api/search?q=&category=`
- `GET /api/v1/auth/me`
- `POST /api/v1/auth/register`
- `POST /api/v1/auth/login`
- `POST /api/v1/auth/logout`

## Customer storefront

Implemented routes include `/`, `/shop`, `/products/:id`, `/cart`, `/login`, and `/register`. The storefront includes responsive navigation, URL-synced search/category/sort filters, product detail pages, loading/error/empty states, and a guest cart persisted in the browser.

The product catalog is still intentionally in-memory; the backend does not yet expose category, cart, wishlist, checkout, order, review, or address APIs. The guest cart is therefore presentation-only and must be replaced with authoritative backend cart/checkout services before accepting orders. No database migrations or production data operations have been run.

## Seller dashboard status

The responsive seller shell is available at `/seller/dashboard`, `/seller/products`, `/seller/inventory`, `/seller/orders`, `/seller/analytics`, and `/seller/settings`. Seller routes use the existing cookie session and require a `SELLER` role. The seller dashboard requests `GET /api/v1/seller/dashboard`, but seller product, inventory, order, analytics, store, and approval APIs are not yet implemented; the UI reports this honestly instead of displaying fabricated metrics. No seller data or database tables were modified.

## Admin dashboard status

The responsive admin shell is available at `/admin/dashboard`, `/admin/sellers`, `/admin/products`, `/admin/orders`, `/admin/customers`, `/admin/inventory`, `/admin/reports`, `/admin/audit-logs`, and `/admin/settings`. Admin routes use the existing cookie session and require an `ADMIN` role. The overview requests `GET /api/v1/admin/dashboard`, but admin APIs, marketplace data tables, permission mappings, moderation workflows, and audit-log persistence are not yet implemented. The UI displays an unavailable state instead of fabricated platform metrics. No production data or database tables were modified.
