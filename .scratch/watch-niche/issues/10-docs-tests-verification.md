# 10: Docs, tests and integrated verification

**What to build:** The repository documents a watch template end to end, its tests describe watch behaviour, and the whole project is green. The specification's data model and storefront/admin acceptance criteria are rewritten for watches. README, contributing guide, changelog, agent guidance and design-system notes are updated. Stale perfume screenshots are removed or clearly marked. All test fixtures use watch products and options.

**Blocked by:** 02, 03, 04, 05, 06, 07, 08, 09

**Status:** ready-for-agent

- [ ] The specification's data model, filters, product page and admin product tasks describe the implemented watch behaviour.
- [ ] README, CONTRIBUTING, CHANGELOG, AGENTS and design-system notes contain no stale perfume instructions.
- [ ] Every test suite uses valid watch fixtures and passes.
- [ ] `pnpm lint`, `pnpm typecheck`, `pnpm test` and `pnpm build` pass.
- [ ] `pnpm db:seed` runs twice idempotently and `pnpm catalog:verify` passes.
- [ ] Home, listing, product, search, cart, checkout and admin product editor are checked at 360 px and desktop.
- [ ] No user-visible perfume wording or `attar-*` identifier remains anywhere in the repository.
