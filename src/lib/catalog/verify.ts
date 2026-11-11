/** Run with the dev server stopped: pnpm catalog:verify */
import assert from "node:assert/strict";
import { db, closeDb } from "@/db";
import { queryCatalog, getFacets, getProduct } from "./query";
import { parseCatalogParams } from "./params";
import type { CatalogParams } from "./params";
import { storeConfig } from "../../../store.config";
async function main() {
  const all = await db.query.products.findMany({
    with: { brand: true, variants: true, features: { with: { feature: true } } },
  });
  assert.ok(all.length > 0, "Seed the database first");
  function expected(p: CatalogParams, scope = parseCatalogParams({})) {
    const sizeMatches = (
      mm: number | null,
      size: CatalogParams["size"][number],
    ) =>
      mm !== null &&
      (size === "under-36"
        ? mm < 36
        : size === "36-40"
          ? mm >= 36 && mm <= 40
          : size === "41-44"
            ? mm >= 41 && mm <= 44
            : mm >= 45);
    function productMatches(row: (typeof all)[number], f: CatalogParams) {
      return (
        row.isActive &&
        (!f.brand.length || f.brand.includes(row.brand.slug)) &&
        (!f.brandType.length || f.brandType.includes(row.brand.brandType)) &&
        (!f.gender.length || f.gender.includes(row.gender)) &&
        (!f.condition.length || f.condition.includes(row.condition)) &&
        (!f.movement.length || f.movement.includes(row.movement)) &&
        (!f.style.length ||
          (row.style !== null && f.style.includes(row.style))) &&
        (!f.material.length ||
          (row.caseMaterial !== null && f.material.includes(row.caseMaterial))) &&
        (!f.strap.length ||
          (row.strapType !== null && f.strap.includes(row.strapType))) &&
        (!f.dial.length ||
          (row.dialColor !== null && f.dial.includes(row.dialColor))) &&
        (!f.glass.length || (row.glass !== null && f.glass.includes(row.glass))) &&
        (!f.size.length || f.size.some((size) => sizeMatches(row.caseSizeMm, size))) &&
        (f.water === undefined ||
          (row.waterResistanceM !== null && row.waterResistanceM >= f.water)) &&
        (!f.feature.length ||
          row.features.some((pf) => f.feature.includes(pf.feature.slug))) &&
        (!f.q ||
          [
            row.name,
            row.brand.name,
            row.description,
            row.collectionName,
            row.referenceNo,
          ].some((text) => text?.toLowerCase().includes(f.q.toLowerCase())))
      );
    }
    function variantMatches(
      v: (typeof all)[number]["variants"][number],
      f: CatalogParams,
    ) {
      return (
        v.isActive &&
        (f.minPrice === undefined || v.price >= f.minPrice) &&
        (f.maxPrice === undefined || v.price <= f.maxPrice) &&
        (!f.inStock || v.stockQuantity > 0) &&
        (!f.deal || v.price < v.retailPrice)
      );
    }
    return all
      .filter(
        (row) =>
          productMatches(row, p) &&
          productMatches(row, scope) &&
          row.variants.some(
            (v) => variantMatches(v, p) && variantMatches(v, scope),
          ),
      )
      .map((p) => p.id)
      .sort();
  }
  const firstFeature = all[0].features[0]?.feature.slug;
  const cases = [
    {},
    { gender: "men", inStock: true },
    { movement: ["automatic", "quartz"], deal: true },
    { size: ["41-44"], maxPrice: 5000 },
    {
      minPrice: 3500,
      maxPrice: 5500,
      material: ["stainless_steel", "alloy"],
    },
    { brand: all[0].brand.slug },
    { feature: firstFeature },
    { style: all[0].style },
    { brandType: "imported", gender: "women" },
    { water: 100 },
    { condition: ["new"] },
    { dial: all[0].dialColor },
    { q: all[0].brand.name },
    { q: all[0].referenceNo },
    { q: "%" },
    { q: "no-such-watch" },
    { minPrice: 9999, maxPrice: 1 },
  ];
  // Totals must always match; full ID lists only when every match fits on one page.
  const sameListing = (
    items: { id: string }[],
    total: number,
    want: string[],
    label: string,
  ) => {
    assert.equal(total, want.length, label);
    const got = items.map((p) => p.id).sort();
    if (want.length <= 100) assert.deepEqual(got, want, label);
    else assert.ok(got.every((id) => new Set(want).has(id)), label);
  };
  for (const raw of cases) {
    const result = await queryCatalog(raw, { limit: 100 });
    sameListing(
      result.items,
      result.total,
      expected(parseCatalogParams(raw)),
      JSON.stringify(raw),
    );
  }
  const scope = { gender: ["men"], minPrice: 4000, size: ["41-44"] };
  const refinement = { maxPrice: 6000, inStock: true };
  const scoped = await queryCatalog(refinement, { scope, limit: 100 });
  sameListing(
    scoped.items,
    scoped.total,
    expected(parseCatalogParams(refinement), parseCatalogParams(scope)),
    "scoped",
  );
  const conflicting = await queryCatalog(
    { gender: "women" },
    { scope: { gender: ["men"] } },
  );
  assert.equal(conflicting.total, 0);
  const first = await queryCatalog(),
    second = await queryCatalog({ page: 2 });
  assert.equal(
    first.items.length,
    Math.min(storeConfig.catalog.pageSize, first.total),
  );
  assert.ok(!first.items.some((p) => second.items.some((q) => q.id === p.id)));
  const priceAsc = await queryCatalog(
    { sort: "price-asc", inStock: true },
    { limit: 100 },
  );
  // Compare SQL ordering to minimum qualifying price, independent of which default option is displayed.
  const minimums = priceAsc.items.map((p) =>
    Math.min(
      ...all
        .find((r) => r.id === p.id)!
        .variants.filter((v) => v.isActive && v.stockQuantity > 0)
        .map((v) => v.price),
    ),
  );
  assert.deepEqual(
    minimums,
    [...minimums].sort((a, b) => a - b),
  );
  // Every option in every facet must equal the listing total after picking it
  // (counts ignore the facet's own selection, so start from a cleared group).
  for (const base of [
    {},
    { gender: "women", inStock: "true" },
    { feature: firstFeature, size: "41-44" },
    { movement: "automatic", water: "100" },
  ]) {
    const facetsFor = await getFacets(base);
    for (const [group, options] of Object.entries(facetsFor)) {
      for (const option of options) {
        const picked = await queryCatalog({
          ...base,
          [group]: option.value,
          page: "1",
        });
        assert.equal(
          option.count,
          picked.total,
          `${JSON.stringify(base)} ${group}=${option.value}`,
        );
      }
    }
    for (const option of facetsFor.feature)
      assert.ok(option.group, "feature facets carry their group");
  }
  const product = await getProduct(all[0].slug);
  assert.ok(product);
  assert.ok(!("costPrice" in product.variants[0]));
  assert.ok(Array.isArray(product.features));
  const related = await queryCatalog(
    {},
    {
      excludeId: product.id,
      limit: 8,
      related: {
        brandId: product.brandId,
        featureIds: product.features.map((f) => f.featureId),
      },
    },
  );
  assert.ok(related.items.length <= 8);
  assert.ok(!related.items.some((p) => p.id === product.id));
  assert.equal(await getProduct("not-a-real-product"), undefined);
  console.log(
    `Catalog verification passed: ${cases.length} watch filter/search cases, scope intersections, pagination, sorting, facets, public option fields, features and related watches.`,
  );
}
main()
  .finally(closeDb)
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  });
