# Spec: Convert the Attar perfume template into a watch store

## Problem Statement

This repo is a fork of an open-source perfume storefront and admin. The owner wants to launch a watch brand on the same commerce foundation — same storefront, phone-confirmed checkout, admin panel and free-tier deployment — but every layer still speaks perfume. Products carry concentration, fragrance family, perfumer and millilitre sizes; browsing is organised around a scent pyramid; the demo catalog is ten fictional fragrance houses with bottle artwork; admin screens, SEO copy, docs and even client storage keys say "Attar" or "fragrance". A partial conversion is already in the working tree, but it leaves the code uncompilable and its generated migration cannot run against a populated database.

The result is that a retailer cannot sell watches, and anyone forking the template cannot build, seed or launch it without first finishing a large, undocumented refactor.

## Solution

Deliver a coherent watch storefront and admin on the existing architecture, starting from a fresh database baseline:

- The product model describes watches: movement, style, case size, case material, strap, glass, water resistance, dial colour, reference number, warranty, condition, launch year and origin. Purchasable units become dial/strap **options** rather than bottle sizes.
- The scent-notes taxonomy becomes a grouped **feature** taxonomy (display, complications, durability, movement, case, strap) used for filtering, the product page and related products.
- Catalog filtering, cards, product detail, search, admin editor and taxonomy all use watch vocabulary and the new fields.
- The demo catalog is ten fictional watch houses with forty models, generated watch illustrations, watch-specific collections, banners, pages, demo orders and reviews.
- Store branding, copy, configuration and client-side identifiers become the watch brand's; no "Attar", "fragrance", "bottle" or "ml" remains in user-visible surfaces.
- Database migrations are squashed into one clean baseline, and seeding stays idempotent.

Everything that is not perfume-specific stays intact: money in integer minor units, phone-only checkout, COD/bKash/Nagad, delivery zones, order state machine and events, rate limits, notification/storage adapters, feature flags, and demo-mode sandboxes.

## User Stories

1. As a shopper, I want to browse watches by brand, gender, movement, case size, case material, strap type, dial colour, glass, water resistance, style, condition and features, so that I can narrow a large catalog to the watch I want.
2. As a shopper, I want filter labels and options written in watch language, so that I understand what each filter means without translating perfume terms.
3. As a shopper, I want the listing to show how many watches match and what each card's movement, case size and option count are, so that I can compare at a glance.
4. As a shopper, I want product cards to show the cheapest or default option's price and stock, so that I can spot deals without opening every product.
5. As a shopper, I want a product page with a watch specification table (movement, case size, case material, strap, glass, water resistance, dial, reference, condition, warranty, launch year, origin), so that I can judge whether it fits me.
6. As a shopper, I want key features such as chronograph, date window, luminous hands, sapphire crystal and screw-down crown shown as grouped chips, so that I can scan the highlights.
7. As a shopper, I want to switch between dial and strap options with their own price and stock, so that I can buy the exact combination I want.
8. As a shopper, I want an option to be disabled when it is out of stock, so that I cannot add an unavailable combination to the bag.
9. As a shopper, I want search to match model names, brand names, collection names and reference numbers, so that I can find a specific watch quickly.
10. As a shopper, I want related watches chosen by shared brand or shared features, so that suggestions are relevant.
11. As a shopper, I want authenticity, warranty and "box and papers" guidance in watch terms, so that I trust what I am buying.
12. As a shopper, I want delivery, payment and phone-confirmation behaviour to stay exactly as it was, so that nothing about ordering becomes harder.
13. As a shopper, I want the full experience to work at 360 px, so that I can shop from an Android phone.
14. As a shopper, I want my wishlist and recently viewed watches to survive a refresh, so that I can return to them.
15. As a shopper, I want reviews written and displayed in watch language, so that review content matches the catalog.
16. As a shopper, I want no perfume wording anywhere in the storefront, so that the shop feels like a watch brand rather than a repurposed template.
17. As a shopper, I want accessible names, labels and empty states for every filter, option picker and gallery, so that the site works with a screen reader.
18. As a shopper, I want correct product structured data including watch offers, so that search engines show accurate prices and availability.

19. As an admin, I want to create and edit a watch with all its specs, so that the catalog can describe real merchandise.
20. As an admin, I want to manage two or more dial/strap options per watch, each with SKU, price, retail price, stock and barcode, so that I can sell combinations.
21. As an admin, I want one option marked default and active, so that listings and checkout always have a purchasable unit.
22. As an admin, I want to attach features to a watch from a grouped taxonomy, so that filters stay consistent instead of free-text drift.
23. As an admin, I want to create, rename and group features, so that the taxonomy can grow with the catalog.
24. As an admin, I want validation errors that name the watch field or option that failed, so that I can fix them without guessing.
25. As an admin, I want the product list and editor to show watch-relevant attributes instead of concentration, so that the admin UI reflects the domain.
26. As an admin, I want existing stock, deal, order, customer, coupon and review workflows unchanged, so that the conversion does not break operations.
27. As an admin, I want seeded demo data that looks like a real watch shop, so that I can evaluate the template before adding my own catalog.

28. As a template developer, I want one clean database baseline, so that a fresh clone can migrate and seed without backfills or manual SQL.
29. As a template developer, I want the seed to stay idempotent, so that running it twice does not duplicate or reset edited data.
30. As a template developer, I want the specification document, README, contributing guide and changelog to describe a watch store, so that I know what the template does.
31. As a template developer, I want fictional brands and generated artwork only, so that I can publish the repo without trademark risk.
32. As a template developer, I want the storefront bundle to stay free of Zod and other server-only code, so that the performance and lint rules of the template still hold.
33. As a template developer, I want feature flags to gate the wishlist, reviews, coupons, recently viewed and deal badges exactly as before, so that disabling a feature removes its UI, routes and queries.
34. As a template developer, I want demo-mode sandboxes to copy the new tables, so that the public demo still works.
35. As a template developer, I want all client storage keys, cookies and internal names to use the watch brand, so that nothing leaks the perfume origin.
36. As a template developer, I want lint, typecheck, tests and production build to pass, so that the template is safe for others to fork.

## Implementation Decisions

### Domain model

- Brand types become `imported`, `mastercopy`, `firstcopy`, `local`. This records the Bangladeshi watch-market distinction between genuine imports, copy tiers and local assembly.
- Products gain `movement` (`quartz`, `automatic`, `mechanical`, `solar`, `digital`, `smart`), `style`, `case_size_mm`, `case_material` (`stainless_steel`, `alloy`, `titanium`, `ceramic`, `gold_plated`, `plastic`), `strap_type` (`leather`, `steel`, `mesh`, `rubber`, `silicone`, `fabric`), `glass`, `water_resistance_m`, `dial_colour`, `reference_no`, `warranty_months`, `launch_year`, `country_of_origin` and `condition` (`new`, `open_box`, `refurbished`, `used`).
- `condition` replaces the perfume `packaging` enum. Watches are merchandised by condition, not tester/sample/mini packaging. "Box and papers" becomes a feature, not a packaging value.
- Product variants lose `size_ml` and rename their free-text label to an option label, such as "Black dial · steel bracelet". Each option keeps its own SKU, prices, stock, barcode, default flag and active flag. A watch may have one or many options; the existing one-default invariant stays.
- The scent-notes tables become a feature taxonomy: a `features` table (name, unique slug, feature group) and a `product_features` join. Note positions (top/heart/base) are removed. The products' free-text features array is removed so the taxonomy is the single source of truth.
- Feature groups are `display`, `complications`, `durability`, `movement`, `case` and `strap`.

### Catalog

- Catalog URL parameters become `brand`, `brandType`, `gender`, `movement`, `material`, `strap`, `dial`, `glass`, `water`, `style`, `condition`, `feature`, `size`, plus existing price, stock, deal, query, sort and page.
- Case-size filtering happens on the product, in buckets `<36`, `36–40`, `41–44` and `45+`. It is deliberately not a variant filter. Variant filtering remains price, stock and deal.
- Facet counts follow the existing rule: counts reflect every current constraint except the facet's own selection. Features are grouped by feature group for display.
- Related products match the same brand or at least one shared feature, excluding the current product.
- Product cards expose the default or cheapest qualifying option, an option count, movement and case size instead of concentration and bottle sizes.
- Search matches model name, brand name, collection name and reference number; product descriptions remain searchable as before.

### Admin

- The admin product schema mirrors the new product and option shapes and validates: one default option, one active default when the product is active, unique SKUs, price not above retail price and non-negative integers.
- The product editor's four tabs become Basics, Options, Images and Features. Basics holds identity, condition, movement, style, case, dial, glass, water resistance, warranty, reference, launch year and origin. Options replaces the millilitre size editor. Features replaces the notes tab.
- The taxonomy admin manages feature groups and features instead of note groups and notes.
- Admin actions keep their existing `requireAdmin` guard and argument validation rules.

### Storefront

- The product detail page replaces the scent pyramid with a grouped Features block and a watch specification table. The buy box calls variants "Options" and shows movement/style/condition chips.
- Filters are ordered for watch shopping: brand, brand type, gender, movement, case size, case material, strap, dial colour, glass, water resistance, style, condition and features.
- All remaining copy moves from fragrance to watch vocabulary: home hero, category shortcuts, brand menu, search placeholders and suggestions, listing counts and empty states, cart, wishlist, reviews, not found and the Open Graph image.
- Client storage keys, the order-confirmation cookie, the demo-sandbox cookie and sandbox schema prefixes move from the Attar prefix to the watch brand prefix.
- The store configuration carries the watch brand name, tagline, order-number prefix, theme colours, announcement bar and SEO description. The existing BDT currency, Dhaka delivery zones, COD and bKash settings remain the default market configuration.

### Data and content

- The demo catalog contains ten fictional watch houses and forty fictional models. Each model has two options, a realistic movement/case/strap/glass/water-resistance configuration and several features drawn from the taxonomy.
- The seed keeps its current structure: settings key, idempotent inserts, collections, banners, homepage sections, static pages, customers, fifteen orders with timelines, coupons and reviews. Copy inside those fixtures becomes watch-specific.
- Static pages explain watch authenticity, warranty, box and papers, delivery and returns.
- The deterministic seed-artwork generator draws a watch (case, dial, hands, crown, lugs, strap) instead of a bottle, and regenerates the committed seed SVGs and hero images. The editorial image used on the admin login is replaced with a watch still life.
- No real watch brand names or photographs appear in the repository.

### Database and project hygiene

- The existing migration set is squashed into a single baseline generated from the final schema. Local PGlite data is discarded. No data migration is written, because this is a template conversion rather than an upgrade of a live store.
- Sandbox table lists and sequences are updated for renamed tables.
- The workspace build-flag placeholders are replaced with valid values.
- Package name, environment-file header, README, changelog, contributing guide, design-system notes and the specification document all describe the watch store.
- The existing architectural invariants remain: Server Components by default, Server Actions for mutations, Zod parsing at every boundary, rate limiting for customer writes, no customer auth, no paid service required, mobile-first at 360 px.

## Testing Decisions

A good test asserts observable behaviour a user or operator can see: which watches a filter combination returns, what counts the facet panel shows, whether an invalid product is rejected with the right field, whether seeding twice leaves one copy of each fixture. Tests must not assert SQL text, internal query shape, component internals or CSS class names.

The single highest seam is the catalog query interface: catalog parameter parsing, the shared catalog query and the facet query. Every listing, brand page, collection page and search page funnels through it, so behaviour is tested once at that seam rather than through pages or components. The admin product validator is the second seam for write behaviour. The seed script is the third for content and idempotency. Storefront rendering is verified manually at 360 px and desktop.

Modules under test:

- Catalog parameter parsing: valid watch filters survive, malformed values are dropped without discarding valid ones, repeated values are preserved in generated links.
- Catalog query and facets: each watch facet narrows results correctly; multi-facet combinations intersect on one purchasable option; case-size buckets use case size, not variants; feature facets are grouped; related products match brand or shared feature.
- Admin product validation: watch fields, option invariants, unique SKUs, price-below-retail, default-option rules.
- Seed: expected brand/product/option/feature/image/order counts, no duplicate fixtures after a second run, and documented preserved state.
- Regression: checkout, cart revalidation, order transitions, coupons, reviews, sandbox copy and demo mode still behave as before.

Prior art is the existing node:test suites for catalog parsing, admin validation, checkout, orders, reviews and sandbox copies, plus the catalog verification harness that checks filtered results against the seeded database. No new browser-testing framework is introduced.

## Out of Scope

- Professional product photography, logo design or brand identity work; generated illustrations remain placeholders.
- Migrating an existing perfume deployment's data. The baseline is squashed and the local database is reset.
- Customer accounts, marketplace/multi-vendor support, multi-currency or internationalisation.
- Payment gateway or courier API integrations beyond the existing adapters.
- Smartwatch-specific health/connectivity specifications beyond a `smart` movement value.
- Re-shooting every README screenshot; stale perfume screenshots are removed or clearly marked instead.
- Any change to money handling, the order state machine, notification adapters, rate limiting or the demo sandbox mechanism.

## Further Notes

- The repository is already mid-conversion: the schema changes for watch fields and brand types are uncommitted on the `watch-niche` branch, and they currently fail to compile because perfume enums remain referenced. That work is the starting point, not a throwaway.
- The generated migration currently in the tree cannot run against populated data; the squash decision removes that hazard rather than papering over it.
- Store name, contact details, theme colours and social links are placeholders until the owner supplies them. The implementation uses a watch-brand default and keeps them configurable in one place.
- The demo catalog must remain fictional. The brand-type taxonomy is a market-positioning choice, so the authenticity page must be explicit that copy-tier and local products are labelled as such.
- Work proceeds on the existing `watch-niche` branch as one integration sequence. The repository is not expected to be green until the schema, catalog, admin, storefront and seed tickets have landed together, so full verification is its own final ticket.
