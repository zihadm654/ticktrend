# Risks

Established 2026-11-11.

- **Intermediate red build.** The repository is uncompilable until the schema, catalog, admin and storefront tickets land. Subagents should run the targeted tests for their slice, not expect whole-repo green before ticket 10. Do not "fix" unrelated compile errors by reverting to perfume fields.
- **Squashed migrations.** Anyone who deployed the Attar version cannot upgrade in place. This is accepted for a template conversion; it must be stated in the changelog.
- **PGlite reset.** The local `.data/` database must be deleted after the baseline changes. A stale `postmaster.pid` can block startup if a dev server was killed.
- **Client key rename.** Renaming `attar-*` keys drops carts and wishlists in existing browsers. Acceptable for a template; needs a changelog note.
- **Generated artwork fidelity.** SVG watch illustrations are placeholders, not photography. Do not use real watch imagery or brand names; trademark risk in an OSS repo.
- **Condition decision.** Replacing packaging with condition is a product choice. If the owner wants box/gift packaging instead, it must be changed before ticket 01 is finalized, because it is an enum migration.
- **Stale screenshots.** README screenshots show the perfume store. Re-shooting every image is out of scope; remove or clearly mark them.
- **Brand-type positioning.** Imported/mastercopy/firstcopy/local implies mixed authenticity tiers. The authenticity page and product labels must not mislead shoppers.
