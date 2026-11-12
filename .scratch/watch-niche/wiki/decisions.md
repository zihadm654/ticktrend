# Decisions

Dated record. Newer decisions supersede older ones; old entries stay.

## 2026-11-11 — Migration strategy

Decided to squash the perfume migration history into one fresh baseline and reset the local embedded database. No data migration is written. Rationale: the repo is a template conversion, the in-tree `0006` migration cannot run against populated data (enum cast and non-null column without default), and there is no production dataset to preserve. See `../spec.md` and ticket 01.

## 2026-11-11 — Notes become features

Decided to repurpose the scent-notes taxonomy as a grouped feature taxonomy instead of deleting it. Features keep the unique slug, group and product join, so grouped facets, product-page chips and related-product matching survive. Note positions are removed. Feature groups: display, complications, durability, movement, case, strap.

## 2026-11-11 — Brand types

Decided to keep the in-progress taxonomy `imported | mastercopy | firstcopy | local`. This records the Bangladeshi watch market and implies the catalog may mix genuine, copy-tier and local products, so the authenticity page must be explicit.

## 2026-11-11 — Variants are options

Decided that a variant is a dial/strap option (for example "Black dial · steel bracelet"), not a case size or a bottle size. Options keep SKU, label, prices, stock, barcode, default and active flags. Case size is a product specification and its own filter.

## 2026-11-11 — Condition replaces packaging

Decided to replace the perfume packaging enum with `condition`: new, open box, refurbished, used. "Box and papers" becomes a feature rather than a packaging value. This is a recommendation in the spec and still reversible before ticket 01 lands.

## 2026-11-11 — Branding defaults

Decided to implement TickTrendFit with the tagline "Timepieces worth wearing.", order prefix `TTF`, a steel/charcoal theme, and the existing Bangladesh market defaults (BDT, Inside/Outside Dhaka, COD and bKash). Contact details remain placeholders until the owner supplies real ones.

## 2026-11-11 — Process

Decided to implement sequentially on `watch-niche` with a fresh subagent per ticket rather than parallel worktrees. Rationale: the schema rename is one repo-wide mechanical refactor, worktrees would each need a full dependency install, and they would collide on shared PGlite state. Green is promised only at ticket 10.
