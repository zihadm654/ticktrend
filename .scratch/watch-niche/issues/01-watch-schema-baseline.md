# 01: Watch schema and fresh migration baseline

**What to build:** The database describes a watch catalog and a fresh clone can create it from empty with one migration. Product enums and columns cover movement, style, case size, case material, strap, glass, water resistance, dial colour, reference number, warranty, condition, launch year and origin. Brand types become imported/mastercopy/firstcopy/local. The scent-notes taxonomy becomes a grouped feature taxonomy with no positions. Variants carry an option label and no millilitre size. Demo-sandbox table lists include the renamed tables, and the workspace build-flag placeholders are valid.

**Blocked by:** None (can start immediately)

**Status:** ready-for-agent

- [ ] Product, variant and feature tables match the agreed watch model; no concentration, fragrance family, perfumer, size_ml or note-position fields remain.
- [ ] Feature groups are display, complications, durability, movement, case and strap.
- [ ] Exactly one clean migration baseline exists; generating again reports no schema diff; migrating an empty database succeeds.
- [ ] The local embedded database has been reset and a re-seed can run from empty.
- [ ] Sandbox and public-only table lists, relations and sequences are updated for renamed tables.
- [ ] `pnpm install` completes without the invalid build-flag placeholder, and the schema module typechecks in isolation.
