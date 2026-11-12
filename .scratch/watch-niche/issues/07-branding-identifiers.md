# 07: Branding, config and client identifiers

**What to build:** The store presents as TickTrendFit. The single store configuration carries the new name, tagline, order-number prefix, steel/charcoal theme, announcement bar and SEO description, and still validates. Every client storage key, order cookie, demo-sandbox cookie, sandbox schema prefix, connection global, package name and environment-file header moves from the Attar prefix to the watch brand prefix. Feature flags, currency, delivery zones and payment methods behave exactly as before.

**Blocked by:** 06

**Status:** ready-for-agent

- [ ] The store configuration validates with TickTrendFit branding and a steel/charcoal palette; `pnpm dev` and `pnpm build` accept it.
- [ ] Theme colours are wired to the existing CSS variables and remain legible at 360 px and desktop.
- [ ] Cart, coupon, wishlist, recently viewed, announcement dismissal, order confirmation and sandbox cookies/schemas use the new prefix.
- [ ] Renaming client keys does not break cart, wishlist or recently viewed behaviour in a fresh browser profile.
- [ ] Package name, environment-file header and default secret/database examples no longer reference Attar.
- [ ] Wishlist, reviews, coupons, recently viewed and deal-badge flags still gate their UI, routes and queries.
