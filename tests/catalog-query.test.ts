import assert from "node:assert/strict";
import { before, after, test } from "node:test";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import {
  brands,
  features,
  productFeatures,
  products,
  productVariants,
} from "../src/db/schema";

let database: typeof import("../src/db");
let catalog: typeof import("../src/lib/catalog/query");
const project = process.cwd();
let temporary: string;

before(async () => {
  temporary = mkdtempSync(join(tmpdir(), "ticktrendfit-catalog-"));
  process.chdir(temporary);
  delete process.env.DATABASE_URL;
  Object.assign(process.env, { NODE_ENV: "test" });
  database = await import("../src/db");
  catalog = await import("../src/lib/catalog/query");
  await migrate(database.db, {
    migrationsFolder: join(project, "src/db/migrations"),
  });
  await database.db.insert(brands).values([
    { id: "brand-northwind", name: "Northwind", slug: "northwind", brandType: "imported" },
    { id: "brand-harbor", name: "Harbor", slug: "harbor", brandType: "local" },
  ]);
  await database.db.insert(features).values([
    { id: "feature-date", name: "Date window", slug: "date-window", group: "display" },
    { id: "feature-sapphire", name: "Sapphire crystal", slug: "sapphire-crystal", group: "durability" },
    { id: "feature-chrono", name: "Chronograph", slug: "chronograph", group: "complications" },
  ]);
  await database.db.insert(products).values([
    {
      id: "watch-alder",
      name: "Alder Automatic",
      slug: "alder-automatic",
      brandId: "brand-northwind",
      collectionName: "Alder",
      description: "Dress watch with a date window.",
      gender: "men",
      condition: "new",
      movement: "automatic",
      style: "dress",
      caseSizeMm: 39,
      caseMaterial: "stainless_steel",
      strapType: "leather",
      glass: "sapphire",
      waterResistanceM: 100,
      dialColor: "black",
      referenceNo: "NW-AL-39",
    },
    {
      id: "watch-brine",
      name: "Brine Quartz",
      slug: "brine-quartz",
      brandId: "brand-harbor",
      collectionName: "Brine",
      description: "Sport watch for the pool.",
      gender: "women",
      condition: "open_box",
      movement: "quartz",
      style: "sport",
      caseSizeMm: 42,
      caseMaterial: "alloy",
      strapType: "rubber",
      glass: "mineral",
      waterResistanceM: 200,
      dialColor: "blue",
      referenceNo: "HB-BR-42",
    },
    {
      id: "watch-cinder",
      name: "Cinder Digital",
      slug: "cinder-digital",
      brandId: "brand-harbor",
      collectionName: "Cinder",
      description: "Digital watch for every day.",
      gender: "unisex",
      condition: "new",
      movement: "digital",
      style: "digital",
      caseSizeMm: 45,
      caseMaterial: "plastic",
      strapType: "fabric",
      glass: "acrylic",
      waterResistanceM: 50,
      dialColor: "black",
      referenceNo: "HB-CD-45",
    },
  ]);
  await database.db.insert(productVariants).values([
    {
      productId: "watch-alder",
      sku: "NW-AL-39-BLK",
      optionLabel: "Black dial · leather strap",
      price: 12000,
      retailPrice: 15000,
      stockQuantity: 3,
      isDefault: true,
    },
    {
      productId: "watch-alder",
      sku: "NW-AL-39-BRN",
      optionLabel: "Brown dial · leather strap",
      price: 9000,
      retailPrice: 9000,
      stockQuantity: 0,
    },
    {
      productId: "watch-brine",
      sku: "HB-BR-42-BLU",
      optionLabel: "Blue dial · rubber strap",
      price: 4500,
      retailPrice: 4500,
      stockQuantity: 5,
      isDefault: true,
    },
    {
      productId: "watch-cinder",
      sku: "HB-CD-45-BLK",
      optionLabel: "Black dial · fabric strap",
      price: 2500,
      retailPrice: 2500,
      stockQuantity: 0,
      isDefault: true,
    },
    {
      productId: "watch-cinder",
      sku: "HB-CD-45-GRY",
      optionLabel: "Grey dial · fabric strap",
      price: 3000,
      retailPrice: 3000,
      stockQuantity: 2,
    },
  ]);
  await database.db.insert(productFeatures).values([
    { productId: "watch-alder", featureId: "feature-date" },
    { productId: "watch-alder", featureId: "feature-sapphire" },
    { productId: "watch-brine", featureId: "feature-date" },
    { productId: "watch-brine", featureId: "feature-chrono" },
    { productId: "watch-cinder", featureId: "feature-chrono" },
  ]);
});
after(async () => {
  await database?.closeDb();
  process.chdir(project);
  if (temporary) rmSync(temporary, { recursive: true, force: true });
});

const ids = async (raw: Record<string, unknown>) =>
  (await catalog.queryCatalog(raw, { limit: 100 })).items
    .map((p) => p.id)
    .sort();
type Facets = Record<string, { value: string; label: string; count: number; group?: string }[]>;
const counts = (facets: Facets, key: string) =>
  Object.fromEntries((facets[key] ?? []).map((o) => [o.value, o.count]));

test("one watch facet narrows the listing", async () => {
  assert.deepEqual(await ids({ movement: "automatic" }), ["watch-alder"]);
  assert.deepEqual(await ids({ movement: ["automatic", "digital"] }), [
    "watch-alder",
    "watch-cinder",
  ]);
  assert.deepEqual(await ids({ brand: "harbor" }), ["watch-brine", "watch-cinder"]);
});

test("case size, movement and feature filters intersect on one watch", async () => {
  assert.deepEqual(
    await ids({
      size: "36-40",
      movement: "automatic",
      feature: "sapphire-crystal",
    }),
    ["watch-alder"],
  );
  // The same case-size bucket with a movement the watch does not have.
  assert.deepEqual(await ids({ size: "36-40", movement: "quartz" }), []);
  // Features are slugs, and any one of them is enough.
  assert.deepEqual(await ids({ feature: "chronograph" }), [
    "watch-brine",
    "watch-cinder",
  ]);
});

test("a combination no watch satisfies returns nothing", async () => {
  const result = await catalog.queryCatalog({
    brand: "northwind",
    material: "plastic",
  });
  assert.equal(result.total, 0);
  assert.deepEqual(result.items, []);
});

test("case-size facets bucket the product case size, not its options", async () => {
  const facets = await catalog.getFacets({});
  assert.deepEqual(counts(facets, "size"), {
    "36-40": 1,
    "41-44": 1,
    "45-plus": 1,
  });
  assert.deepEqual(await ids({ size: "45-plus" }), ["watch-cinder"]);
  assert.deepEqual(await ids({ size: "41-44" }), ["watch-brine"]);
});

test("water resistance is a minimum and its facets are labelled in metres", async () => {
  assert.deepEqual(await ids({ water: 100 }), ["watch-alder", "watch-brine"]);
  assert.deepEqual(await ids({ water: 200 }), ["watch-brine"]);
  assert.deepEqual(await ids({ water: 300 }), []);
  const water = (await catalog.getFacets({})).water;
  assert.deepEqual(
    Object.fromEntries(water.map((o) => [o.value, o.label])),
    { "30": "30 m+", "50": "50 m+", "100": "100 m+", "200": "200 m+" },
  );
});

test("facet counts exclude only the facet's own selection", async () => {
  const baseline = await catalog.getFacets({});
  assert.deepEqual(counts(baseline, "movement"), {
    automatic: 1,
    quartz: 1,
    digital: 1,
  });
  assert.deepEqual(counts(baseline, "brand"), { northwind: 1, harbor: 2 });
  assert.deepEqual(counts(baseline, "feature"), {
    "date-window": 2,
    "chronograph": 2,
    "sapphire-crystal": 1,
  });
  assert.deepEqual(counts(baseline, "water"), {
    "30": 3,
    "50": 3,
    "100": 2,
    "200": 1,
  });
  assert.equal(
    baseline.feature.find((o) => o.value === "date-window")?.group,
    "display",
  );

  const automaticOnly = await catalog.getFacets({ movement: "automatic" });
  // The movement facet ignores its own selection, so every movement keeps its count.
  assert.deepEqual(counts(automaticOnly, "movement"), {
    automatic: 1,
    quartz: 1,
    digital: 1,
  });
  // Every other facet reflects the automatic filter.
  assert.deepEqual(counts(automaticOnly, "brand"), { northwind: 1 });
  assert.deepEqual(counts(automaticOnly, "feature"), {
    "date-window": 1,
    "sapphire-crystal": 1,
  });
  assert.deepEqual(counts(automaticOnly, "size"), { "36-40": 1 });
  assert.deepEqual(counts(automaticOnly, "water"), {
    "30": 1,
    "50": 1,
    "100": 1,
  });
});

test("each facet count matches the listing total after picking that option", async () => {
  for (const base of [{}, { movement: "automatic" }, { feature: "date-window" }]) {
    const facets = await catalog.getFacets(base);
    for (const [group, options] of Object.entries(facets)) {
      for (const option of options) {
        const total = (
          await catalog.queryCatalog({ ...base, [group]: option.value })
        ).total;
        assert.equal(
          option.count,
          total,
          `${JSON.stringify(base)} ${group}=${option.value}`,
        );
      }
    }
  }
});

test("price, stock and deal stay option-level while case size is product-level", async () => {
  // Alder's cheaper 9,000 option is out of stock and its buyable option costs 12,000.
  const narrowed = await catalog.queryCatalog(
    { maxPrice: 10000, inStock: true },
    { limit: 100 },
  );
  assert.deepEqual(narrowed.items.map((p) => p.id).sort(), [
    "watch-brine",
    "watch-cinder",
  ]);
  const cinder = narrowed.items.find((p) => p.id === "watch-cinder")!;
  assert.equal(cinder.variant.price, 3000);
  assert.equal(cinder.variant.stockQuantity, 2);
  assert.equal(cinder.options, 1);
  assert.equal(cinder.movement, "digital");
  assert.equal(cinder.caseSizeMm, 45);
  assert.ok(!("concentration" in cinder));
  assert.ok(!("sizes" in cinder));

  const priceAsc = await catalog.queryCatalog({
    brand: "northwind",
    sort: "price-asc",
  });
  assert.equal(priceAsc.items[0].variant.price, 9000);
  const unfiltered = await catalog.queryCatalog({ brand: "northwind" });
  assert.equal(unfiltered.items[0].options, 2);
  assert.equal(unfiltered.items[0].variant.price, 12000);
  assert.deepEqual(await ids({ deal: true }), ["watch-alder"]);
});

test("related watches share the brand or a feature and exclude the current watch", async () => {
  const alder = await catalog.queryCatalog(
    {},
    {
      excludeId: "watch-alder",
      related: {
        brandId: "brand-northwind",
        featureIds: ["feature-date", "feature-sapphire"],
      },
    },
  );
  assert.deepEqual(alder.items.map((p) => p.id), ["watch-brine"]);

  const brine = await catalog.queryCatalog(
    {},
    {
      excludeId: "watch-brine",
      limit: 100,
      related: {
        brandId: "brand-harbor",
        featureIds: ["feature-date", "feature-chrono"],
      },
    },
  );
  assert.deepEqual(brine.items.map((p) => p.id).sort(), [
    "watch-alder",
    "watch-cinder",
  ]);
  assert.ok(brine.items.length <= 8);
});

test("search matches model, brand, collection and reference number", async () => {
  assert.deepEqual(await ids({ q: "northwind" }), ["watch-alder"]);
  assert.deepEqual(await ids({ q: "Cinder" }), ["watch-cinder"]);
  assert.deepEqual(await ids({ q: "Alder" }), ["watch-alder"]);
  assert.deepEqual(await ids({ q: "HB-BR-42" }), ["watch-brine"]);
  assert.deepEqual(await ids({ q: "no-such-watch" }), []);
});

test("search suggestions return the option label", async () => {
  const suggestions = await catalog.searchSuggestions("Brine");
  assert.equal(suggestions.products.length, 1);
  assert.equal(suggestions.products[0].brand, "Harbor");
  assert.equal(suggestions.products[0].option, "Blue dial · rubber strap");
});

test("the product detail exposes features with their groups and no cost price", async () => {
  const product = await catalog.getProduct("alder-automatic");
  assert.ok(product);
  assert.deepEqual(
    product.features.map((f) => f.feature.slug).sort(),
    ["date-window", "sapphire-crystal"],
  );
  assert.deepEqual(
    product.features.map((f) => f.feature.group).sort(),
    ["display", "durability"],
  );
  assert.equal(product.variants[0].optionLabel, "Black dial · leather strap");
  assert.ok(!("costPrice" in product.variants[0]));
  assert.equal(await catalog.getProduct("not-a-real-watch"), undefined);
});
