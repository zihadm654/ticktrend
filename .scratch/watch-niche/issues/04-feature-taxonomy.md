# 04: Feature taxonomy in admin

**What to build:** An admin can manage the grouped feature taxonomy from the taxonomy section: create, rename and regroup features used by filters and product pages. The section lists features grouped by display, complications, durability, movement, case and strap, with counts. The old notes wording, icons and routes are gone. Admin actions keep their existing guards and validated input.

**Blocked by:** 03

**Status:** ready-for-agent

- [ ] Feature entities can be created and updated through the existing entity editor.
- [ ] The taxonomy page lists features grouped by feature group with per-group counts and a sensible empty state.
- [ ] Navigation, page titles and breadcrumbs say Features, not Notes.
- [ ] Deleting or renaming a feature does not break product editing; referenced features remain selectable.
- [ ] Existing admin authorization tests still pass and no new unprotected server-action module is introduced.
