# 02: Catalog query and filter vocabulary

**What to build:** Shoppers can filter a watch catalog through URL parameters and get correct products and facet counts. Filters cover brand, brand type, gender, movement, case size, case material, strap, dial colour, glass, water resistance, style, condition and features. Case-size buckets are `<36`, `36–40`, `41–44` and `45+` and read the product's case size. Feature facets are grouped by feature group. Related watches match the same brand or a shared feature. Cards expose the default or cheapest qualifying option, an option count, movement and case size.

**Blocked by:** 01

**Status:** ready-for-agent

- [ ] Catalog parameter parsing accepts every watch filter, drops malformed values without discarding valid ones, and preserves repeated values in generated links.
- [ ] The shared catalog query composes product and option predicates so multi-filter results intersect on one purchasable option.
- [ ] Price, stock and deal filters remain option-level; case size is product-level.
- [ ] Facet counts exclude only the facet's own selection, and feature facets carry their group for display.
- [ ] Search matches model, brand, collection and reference number.
- [ ] Catalog verification scenarios express watch filters and pass against the seeded catalog once ticket 08 lands.
- [ ] Behavioural tests through the catalog query and parameter-parsing seams cover one facet, a multi-facet intersection and a zero-result case.
