# 08: Demo catalog data and seed

**What to build:** `pnpm db:seed` fills a believable fictional watch store: ten invented watch houses, forty models with two dial/strap options each, realistic movement/case/strap/glass/water-resistance configurations, features across all groups, four collections, banners, homepage sections, static pages, ten customers, fifteen orders with timelines, coupons and reviews. All fixture copy is watch-specific and no real brand or trademarked name appears. Running the seed twice leaves one copy of each fixture and preserves edits.

**Blocked by:** 01, 02

**Status:** ready-for-agent

- [ ] Seeded counts match the documented expectations for brands, products, options, images, features, product-feature links, collections, banners, sections, pages, orders, items and events.
- [ ] Every seeded product has a default option with stock and at least one feature; movement, case size, material, strap, glass and condition are populated plausibly.
- [ ] Collections, homepage sections and banners describe watch categories (for example men, women, automatic, dress) and link to valid filters.
- [ ] Static pages cover watch authenticity, warranty, box and papers, delivery and returns.
- [ ] Demo order notes, review titles and bodies use watch language.
- [ ] A second `pnpm db:seed` is idempotent and the seed-verification script passes.
