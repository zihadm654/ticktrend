import test from "node:test";
import assert from "node:assert/strict";
import { parseCatalogParams, catalogHref } from "../src/lib/catalog/params";
import { label, waterLabel } from "../src/lib/catalog/labels";
test("catalog parameters retain valid watch filters and reject malformed values", () => {
  const p = parseCatalogParams({
    gender: "men",
    movement: ["quartz", "smart"],
    condition: ["open_box"],
    style: ["dress", "sport"],
    material: "titanium",
    strap: "leather",
    size: "41-44",
    water: "100",
    brandType: "nonsense",
    minPrice: "-1",
    maxPrice: "2000",
    sort: "bad",
    page: "0",
    inStock: "true",
  });
  assert.deepEqual(p.gender, ["men"]);
  assert.deepEqual(p.movement, ["quartz", "smart"]);
  assert.deepEqual(p.condition, ["open_box"]);
  assert.deepEqual(p.style, ["dress", "sport"]);
  assert.deepEqual(p.material, ["titanium"]);
  assert.deepEqual(p.strap, ["leather"]);
  assert.deepEqual(p.size, ["41-44"]);
  assert.equal(p.water, 100);
  // Malformed fields drop out; the valid ones above survive.
  assert.deepEqual(p.brandType, []);
  assert.equal(p.minPrice, undefined);
  assert.equal(p.maxPrice, 2000);
  assert.equal(p.sort, "newest");
  assert.equal(p.page, 1);
  assert.equal(p.inStock, true);
});
test("every watch list filter keeps repeated URL values", () => {
  const p = parseCatalogParams({
    brand: ["northwind", "harbor"],
    brandType: ["imported", "local"],
    movement: ["automatic", "digital"],
    material: ["stainless_steel"],
    strap: ["leather", "mesh"],
    dial: ["black", "blue"],
    glass: ["sapphire"],
    style: ["dress"],
    feature: ["date-window", "chronograph"],
    size: ["36-40", "45-plus"],
  });
  assert.deepEqual(p.brand, ["northwind", "harbor"]);
  assert.deepEqual(p.brandType, ["imported", "local"]);
  assert.deepEqual(p.movement, ["automatic", "digital"]);
  assert.deepEqual(p.material, ["stainless_steel"]);
  assert.deepEqual(p.strap, ["leather", "mesh"]);
  assert.deepEqual(p.dial, ["black", "blue"]);
  assert.deepEqual(p.glass, ["sapphire"]);
  assert.deepEqual(p.style, ["dress"]);
  assert.deepEqual(p.feature, ["date-window", "chronograph"]);
  assert.deepEqual(p.size, ["36-40", "45-plus"]);
});
test("filter links preserve repeated values and clear page", () => {
  assert.equal(
    catalogHref(
      "/products",
      {
        brand: ["northwind", "harbor"],
        size: ["36-40", "45-plus"],
        page: "2",
        q: "diver & date",
      },
      { page: undefined, brand: ["harbor"] },
    ),
    "/products?brand=harbor&size=36-40&size=45-plus&q=diver+%26+date",
  );
});
test("watch facet labels are human readable", () => {
  assert.equal(label("stainless_steel"), "Stainless steel");
  assert.equal(label("open_box"), "Open box");
  assert.equal(label("sapphire"), "Sapphire crystal");
  assert.equal(label("complications"), "Complications");
  assert.equal(label("36-40"), "36–40 mm");
  assert.equal(waterLabel(100), "100 m+");
});
