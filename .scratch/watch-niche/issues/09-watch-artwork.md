# 09: Watch artwork and editorial image

**What to build:** The deterministic seed-artwork generator draws a watch — case, dial, hands, crown, lugs and strap — instead of a perfume bottle, and regenerating assets reproduces every committed seed and hero SVG. The admin-login editorial image is replaced with a watch still life. Brand hero images and category tiles match the new watch catalog.

**Blocked by:** 08

**Status:** ready-for-agent

- [ ] Running the artwork generator produces all referenced product, brand, category and hero SVGs with no missing files.
- [ ] Product artwork reads as a watch at card and full size, with legible fictional labels and stable output across runs.
- [ ] Brand and category imagery is consistent in palette and does not depict a real product.
- [ ] The admin-login editorial image is replaced and no fragrance still life remains in `public/`.
- [ ] Every image referenced by the seed exists and loads on the storefront.
