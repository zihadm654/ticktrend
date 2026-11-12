# Testing seams

Established 2026-11-11.

The design keeps three seams; no new browser-testing framework is introduced.

1. **Catalog query interface** — parameter parsing, the shared catalog query and the facet query. This is the highest seam: every listing, brand page, collection page and search page uses it. Tests assert which watches a filter combination returns and what counts the facets report. They must not assert SQL text or internal query shape.
2. **Admin product validator** — the write-side seam. Tests assert acceptance/rejection of watch payloads: option default rules, unique SKUs, price not above retail, integer money, feature ids.
3. **Seed script** — the content and idempotency seam. Tests assert fixture counts, that every product has a default option and features, and that a second run changes nothing.

Regression coverage for checkout, cart revalidation, order transitions, coupons, reviews, sandbox copies and demo mode uses the existing suites and must keep passing.

Manual verification is required at 360 px and desktop for home, listing, product, search, cart, checkout and the admin product editor.

Prior art: existing node:test suites and the catalog verification harness. See `../spec.md` "Testing Decisions".
