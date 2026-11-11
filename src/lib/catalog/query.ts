import {
  and,
  asc,
  desc,
  eq,
  exists,
  gte,
  ilike,
  inArray,
  lte,
  or,
  sql,
  type SQL,
} from "drizzle-orm";
import type { AnyPgColumn } from "drizzle-orm/pg-core";
import { cache } from "react";
import { db } from "@/db";
import {
  brands,
  features,
  productFeatures,
  productImages,
  products,
  productVariants as variants,
} from "@/db/schema";
import { storeConfig } from "../../../store.config";
import { parseCatalogParams, type CatalogParams } from "./params";
import { label, waterBuckets, waterLabel } from "./labels";
import { getRatingsFor } from "@/lib/reviews/server";

export type PublicVariant = Pick<
  typeof variants.$inferSelect,
  | "id"
  | "sku"
  | "optionLabel"
  | "price"
  | "retailPrice"
  | "stockQuantity"
  | "lowStockOverride"
  | "barcode"
  | "isDefault"
>;
export type ProductCardData = {
  id: string;
  name: string;
  slug: string;
  brand: { name: string; slug: string };
  movement: string;
  caseSizeMm: number | null;
  image: { url: string; alt: string } | null;
  hoverImage: { url: string; alt: string } | null;
  /** Default or cheapest option that satisfies the active filters. */
  variant: PublicVariant;
  /** Options on offer (within the active filters on listings). */
  options: number;
  hasStock: boolean;
  /** Approved-review aggregate; absent when reviews are off or none exist. */
  rating?: { average: number; count: number };
};
const publicVariantColumns = {
  id: true,
  sku: true,
  optionLabel: true,
  price: true,
  retailPrice: true,
  stockQuantity: true,
  lowStockOverride: true,
  barcode: true,
  isDefault: true,
} as const;
const escapeLike = (value: string) => value.replace(/[\\%_]/g, "\\$&");
/** Only price, stock and deal narrow which option is purchased; case size is a product spec. */
function variantWhere(p: CatalogParams): SQL {
  const conditions: SQL[] = [eq(variants.isActive, true)];
  if (p.minPrice !== undefined)
    conditions.push(gte(variants.price, p.minPrice));
  if (p.maxPrice !== undefined)
    conditions.push(lte(variants.price, p.maxPrice));
  if (p.inStock) conditions.push(sql`${variants.stockQuantity} > 0`);
  if (p.deal) conditions.push(sql`${variants.price} < ${variants.retailPrice}`);
  return and(...conditions)!;
}
/** Case-size buckets read the product, not its options. */
function caseSizeWhere(bucket: CatalogParams["size"][number]): SQL {
  return bucket === "under-36"
    ? sql`${products.caseSizeMm} < 36`
    : bucket === "36-40"
      ? sql`${products.caseSizeMm} between 36 and 40`
      : bucket === "41-44"
        ? sql`${products.caseSizeMm} between 41 and 44`
        : sql`${products.caseSizeMm} >= 45`;
}
/** Product AND variant predicates compose once. Variant constraints must match the same variant. */
export function catalogWhere(p: CatalogParams): SQL {
  const conditions: SQL[] = [
    eq(products.isActive, true),
    exists(
      db
        .select({ id: variants.id })
        .from(variants)
        .where(and(eq(variants.productId, products.id), variantWhere(p))),
    ),
  ];
  if (p.brand.length) conditions.push(inArray(brands.slug, p.brand));
  if (p.brandType.length)
    conditions.push(inArray(brands.brandType, p.brandType));
  if (p.gender.length) conditions.push(inArray(products.gender, p.gender));
  if (p.condition.length)
    conditions.push(inArray(products.condition, p.condition));
  if (p.movement.length)
    conditions.push(inArray(products.movement, p.movement));
  if (p.style.length) conditions.push(inArray(products.style, p.style));
  if (p.material.length)
    conditions.push(inArray(products.caseMaterial, p.material));
  if (p.strap.length) conditions.push(inArray(products.strapType, p.strap));
  if (p.dial.length) conditions.push(inArray(products.dialColor, p.dial));
  if (p.glass.length) conditions.push(inArray(products.glass, p.glass));
  if (p.size.length)
    conditions.push(or(...p.size.map(caseSizeWhere))!);
  if (p.water !== undefined)
    conditions.push(gte(products.waterResistanceM, p.water));
  if (p.feature.length)
    conditions.push(
      exists(
        db
          .select({ id: productFeatures.featureId })
          .from(productFeatures)
          .innerJoin(features, eq(features.id, productFeatures.featureId))
          .where(
            and(
              eq(productFeatures.productId, products.id),
              inArray(features.slug, p.feature),
            ),
          ),
      ),
    );
  if (p.new)
    conditions.push(
      gte(
        products.createdAt,
        new Date(Date.now() - storeConfig.catalog.newArrivalDays * 86400000),
      ),
    );
  if (p.q) {
    const term = `%${escapeLike(p.q)}%`;
    conditions.push(
      or(
        ilike(products.name, term),
        ilike(brands.name, term),
        ilike(products.description, term),
        ilike(products.collectionName, term),
        ilike(products.referenceNo, term),
      )!,
    );
  }
  return and(...conditions)!;
}
/** The card shows the default option when it is buyable, otherwise the cheapest. */
function cardVariant(items: PublicVariant[], sort: CatalogParams["sort"]) {
  const cheapest = [...items].sort((a, b) => a.price - b.price)[0];
  if (sort === "price-asc" || sort === "price-desc") return cheapest;
  if (sort === "discount")
    return [...items].sort(
      (a, b) =>
        (b.retailPrice - b.price) / (b.retailPrice || 1) -
        (a.retailPrice - a.price) / (a.retailPrice || 1),
    )[0];
  return (
    items.find((v) => v.isDefault && v.stockQuantity > 0) ??
    items.find((v) => v.stockQuantity > 0) ??
    items.find((v) => v.isDefault) ??
    cheapest
  );
}
export async function queryCatalog(
  raw: Record<string, unknown> = {},
  options: {
    scope?: Record<string, unknown>;
    limit?: number;
    featured?: boolean;
    excludeId?: string;
    related?: { brandId: string; featureIds: string[] };
  } = {},
) {
  const params = parseCatalogParams(raw);
  const scope = parseCatalogParams(options.scope);
  const filters: SQL[] = [catalogWhere(params), catalogWhere(scope)];
  if (options.featured) filters.push(eq(products.isFeatured, true));
  if (options.excludeId)
    filters.push(sql`${products.id} <> ${options.excludeId}`);
  if (options.related)
    filters.push(
      or(
        eq(products.brandId, options.related.brandId),
        exists(
          db
            .select({ id: productFeatures.featureId })
            .from(productFeatures)
            .where(
              and(
                eq(productFeatures.productId, products.id),
                options.related.featureIds.length
                  ? inArray(productFeatures.featureId, options.related.featureIds)
                  : sql`false`,
              ),
            ),
        ),
      )!,
    );
  const where = and(...filters)!;
  const price = sql<number>`(select min(${variants.price}) from ${variants} where ${variants.productId} = ${products.id} and ${variantWhere(params)} and ${variantWhere(scope)})`;
  const discount = sql<number>`(select max((${variants.retailPrice} - ${variants.price})::numeric / nullif(${variants.retailPrice}, 0)) from ${variants} where ${variants.productId} = ${products.id} and ${variantWhere(params)} and ${variantWhere(scope)})`;
  const sort = raw.sort ? params.sort : scope.sort;
  const order: SQL[] = [];
  if (params.q)
    order.push(
      sql`case when ${brands.name} ilike ${`%${escapeLike(params.q)}%`} then 0 when ${products.name} ilike ${`%${escapeLike(params.q)}%`} then 1 else 2 end`,
    );
  order.push(
    sort === "price-asc"
      ? asc(price)
      : sort === "price-desc"
        ? desc(price)
        : sort === "discount"
          ? sql`${discount} desc nulls last`
          : sort === "name"
            ? asc(products.name)
            : desc(products.createdAt),
    asc(products.id),
  );
  // This extra EXISTS makes collection and shopper variant constraints intersect on one option.
  const combinedWhere = and(
    where,
    exists(
      db
        .select({ id: variants.id })
        .from(variants)
        .where(
          and(
            eq(variants.productId, products.id),
            variantWhere(params),
            variantWhere(scope),
          ),
        ),
    ),
  )!;
  const [count] = await db
    .select({ total: sql<number>`count(*)::int` })
    .from(products)
    .innerJoin(brands, eq(brands.id, products.brandId))
    .where(combinedWhere);
  // Related suggestions stay a short strip no matter what the caller asks for.
  const pageSize = options.related
    ? Math.min(options.limit ?? 8, 8)
    : (options.limit ?? storeConfig.catalog.pageSize);
  const pages = Math.max(1, Math.ceil(count.total / pageSize));
  const page = Math.min(params.page, pages);
  const rows = await db
    .select({ id: products.id })
    .from(products)
    .innerJoin(brands, eq(brands.id, products.brandId))
    .where(combinedWhere)
    .orderBy(...order)
    .limit(pageSize)
    .offset((page - 1) * pageSize);
  const cards = rows.length
    ? await db.query.products.findMany({
        where: inArray(
          products.id,
          rows.map((r) => r.id),
        ),
        with: {
          brand: { columns: { name: true, slug: true } },
          images: {
            columns: { url: true, alt: true },
            orderBy: [asc(productImages.sortOrder)],
            limit: 2,
          },
          variants: {
            columns: publicVariantColumns,
            where: and(variantWhere(params), variantWhere(scope)),
            orderBy: [desc(variants.isDefault), asc(variants.price)],
          },
        },
      })
    : [];
  const mapped = new Map<string, ProductCardData>(
    cards.map((p) => [
      p.id,
      {
        id: p.id,
        name: p.name,
        slug: p.slug,
        brand: p.brand,
        movement: p.movement,
        caseSizeMm: p.caseSizeMm,
        image: p.images[0] ?? null,
        hoverImage: p.images[1] ?? null,
        variant: cardVariant(p.variants, sort),
        options: p.variants.length,
        hasStock: p.variants.some((v) => v.stockQuantity > 0),
      } satisfies ProductCardData,
    ]),
  );
  const ratings = await getRatingsFor(rows.map((r) => r.id));
  for (const [id, rating] of ratings) {
    const card = mapped.get(id);
    if (card) card.rating = rating;
  }
  return {
    items: rows.map((r) => mapped.get(r.id)!),
    total: count.total,
    pages,
    page,
    params,
  };
}
/** Cards for an explicit id list (wishlist, recently viewed), in the given order. Inactive products drop out. */
export async function getCardsByIds(ids: string[]): Promise<ProductCardData[]> {
  const unique = [...new Set(ids)].slice(0, 60);
  if (!unique.length) return [];
  const rows = await db.query.products.findMany({
    where: and(inArray(products.id, unique), eq(products.isActive, true)),
    with: {
      brand: { columns: { name: true, slug: true } },
      images: {
        columns: { url: true, alt: true },
        orderBy: [asc(productImages.sortOrder)],
        limit: 2,
      },
      variants: {
        columns: publicVariantColumns,
        where: eq(variants.isActive, true),
        orderBy: [desc(variants.isDefault), asc(variants.price)],
      },
    },
  });
  const ratings = await getRatingsFor(rows.map((r) => r.id));
  const cards = new Map(
    rows
      .filter((p) => p.variants.length)
      .map((p) => [
        p.id,
        {
          id: p.id,
          name: p.name,
          slug: p.slug,
          brand: p.brand,
          movement: p.movement,
          caseSizeMm: p.caseSizeMm,
          image: p.images[0] ?? null,
          hoverImage: p.images[1] ?? null,
          variant: cardVariant(p.variants, "newest"),
          options: p.variants.length,
          hasStock: p.variants.some((v) => v.stockQuantity > 0),
          ...(ratings.has(p.id) ? { rating: ratings.get(p.id) } : {}),
        } satisfies ProductCardData,
      ]),
  );
  return unique.flatMap((id) => cards.get(id) ?? []);
}

/** Header autosuggest: top products (via the shared catalog query) plus matching brands. */
export async function searchSuggestions(q: string) {
  const term = q.trim().slice(0, 80);
  if (term.length < 2) return { products: [], brands: [], total: 0 };
  const [catalog, brandRows] = await Promise.all([
    queryCatalog({ q: term }, { limit: 5 }),
    db
      .select({ name: brands.name, slug: brands.slug, logoUrl: brands.logoUrl })
      .from(brands)
      .where(ilike(brands.name, `%${escapeLike(term)}%`))
      .orderBy(
        sql`case when ${brands.name} ilike ${`${escapeLike(term)}%`} then 0 else 1 end`,
        asc(brands.name),
      )
      .limit(4),
  ]);
  return {
    products: catalog.items.map((p) => ({
      name: p.name,
      slug: p.slug,
      brand: p.brand.name,
      image: p.image?.url ?? null,
      price: p.variant.price,
      retailPrice: p.variant.retailPrice,
      option: p.variant.optionLabel,
      hasStock: p.hasStock,
    })),
    brands: brandRows,
    total: catalog.total,
  };
}
export type Suggestions = Awaited<ReturnType<typeof searchSuggestions>>;

export const getProduct = cache(async (slug: string) =>
  db.query.products.findFirst({
    where: and(eq(products.slug, slug), eq(products.isActive, true)),
    with: {
      brand: true,
      images: { orderBy: [asc(productImages.sortOrder)] },
      variants: {
        columns: publicVariantColumns,
        where: eq(variants.isActive, true),
        orderBy: [desc(variants.isDefault), asc(variants.price)],
      },
      features: { with: { feature: true } },
    },
  }),
);
export type ProductDetail = NonNullable<Awaited<ReturnType<typeof getProduct>>>;

type Facet = { value: string; label: string; count: number; group?: string };
/** Facet groups in watch-shopping order; keys must match catalog URL params. */
export const facetGroups = [
  "brand",
  "brandType",
  "gender",
  "movement",
  "material",
  "strap",
  "dial",
  "glass",
  "style",
  "condition",
  "size",
  "feature",
  "water",
] as const;
const facetColumns = {
  brandType: brands.brandType,
  gender: products.gender,
  movement: products.movement,
  material: products.caseMaterial,
  strap: products.strapType,
  dial: products.dialColor,
  glass: products.glass,
  style: products.style,
  condition: products.condition,
} as const;
/** Products matching every constraint except the facet's own selection. */
function matchedQuery(p: CatalogParams, scope: CatalogParams) {
  return db
    .select({ id: products.id })
    .from(products)
    .innerJoin(brands, eq(brands.id, products.brandId))
    .where(
      and(
        catalogWhere(p),
        catalogWhere(scope),
        exists(
          db
            .select({ id: variants.id })
            .from(variants)
            .where(
              and(
                eq(variants.productId, products.id),
                variantWhere(p),
                variantWhere(scope),
              ),
            ),
        ),
      ),
    );
}
type MatchedQuery = ReturnType<typeof matchedQuery>;
async function brandFacet(matched: MatchedQuery): Promise<Facet[]> {
  return db
    .select({
      value: brands.slug,
      label: brands.name,
      // One row per product (products → brands is many-to-one), so no distinct needed.
      count: sql<number>`count(*)::int`,
    })
    .from(products)
    .innerJoin(brands, eq(brands.id, products.brandId))
    .where(inArray(products.id, matched))
    .groupBy(brands.slug, brands.name)
    .orderBy(asc(brands.name));
}
async function columnFacet(
  column: AnyPgColumn,
  matched: MatchedQuery,
): Promise<Facet[]> {
  const rows = await db
    .select({
      value: column,
      label: column,
      count: sql<number>`count(*)::int`,
    })
    .from(products)
    .innerJoin(brands, eq(brands.id, products.brandId))
    .where(inArray(products.id, matched))
    .groupBy(column)
    .orderBy(asc(column));
  return rows.flatMap((row) =>
    row.value === null || row.label === null
      ? []
      : [
          {
            value: String(row.value),
            label: String(row.label),
            count: row.count,
          },
        ],
  );
}
/** Case-size buckets: under 36, 36–40, 41–44, 45+ millimetres. */
async function sizeFacet(matched: MatchedQuery): Promise<Facet[]> {
  const bucket = sql<string>`case when ${products.caseSizeMm} < 36 then 'under-36' when ${products.caseSizeMm} <= 40 then '36-40' when ${products.caseSizeMm} <= 44 then '41-44' else '45-plus' end`;
  const rows = await db
    .select({ value: bucket, count: sql<number>`count(*)::int` })
    .from(products)
    .innerJoin(brands, eq(brands.id, products.brandId))
    .where(
      and(
        inArray(products.id, matched),
        sql`${products.caseSizeMm} is not null`,
      ),
    )
    .groupBy(bucket);
  const order = ["under-36", "36-40", "41-44", "45-plus"];
  return rows
    .map((row) => ({
      value: row.value,
      label: label(row.value),
      count: row.count,
    }))
    .sort((a, b) => order.indexOf(a.value) - order.indexOf(b.value));
}
/** Grouped feature facets; the UI renders the subheading from `group`. */
async function featureFacet(matched: MatchedQuery): Promise<Facet[]> {
  const pairs = db
    .selectDistinct({
      featureId: productFeatures.featureId,
      productId: productFeatures.productId,
    })
    .from(productFeatures)
    .where(inArray(productFeatures.productId, matched))
    .as("feature_pairs");
  return db
    .select({
      value: features.slug,
      label: features.name,
      group: features.group,
      count: sql<number>`count(*)::int`,
    })
    .from(pairs)
    .innerJoin(features, eq(features.id, pairs.featureId))
    .groupBy(features.id)
    .orderBy(asc(features.group), asc(features.name));
}
/** Useful minimums, so "100 m+" means the watch survives at least 100 m. */
async function waterFacet(matched: MatchedQuery): Promise<Facet[]> {
  const options = await Promise.all(
    waterBuckets.map(async (metres) => {
      const [row] = await db
        .select({ count: sql<number>`count(*)::int` })
        .from(products)
        .innerJoin(brands, eq(brands.id, products.brandId))
        .where(
          and(
            inArray(products.id, matched),
            gte(products.waterResistanceM, metres),
          ),
        );
      return {
        value: String(metres),
        label: waterLabel(metres),
        count: row.count,
      };
    }),
  );
  return options.filter((option) => option.count > 0);
}
/** Counts reflect all current constraints except the facet's own selection. */
export async function getFacets(
  raw: Record<string, unknown>,
  scopeRaw: Record<string, unknown> = {},
) {
  const p = parseCatalogParams(raw),
    scope = parseCatalogParams(scopeRaw);
  // Independent queries: run them together instead of one round trip after another.
  const counts = await Promise.all(
    facetGroups.map(async (key): Promise<Facet[]> => {
      // Clearing a selection keeps every other filter; water is a number, not a list.
      const own: CatalogParams =
        key === "water" ? { ...p, water: undefined } : { ...p, [key]: [] };
      const matched = matchedQuery(own, scope);
      if (key === "brand") return brandFacet(matched);
      if (key === "feature") return featureFacet(matched);
      if (key === "size") return sizeFacet(matched);
      if (key === "water") return waterFacet(matched);
      return columnFacet(facetColumns[key], matched);
    }),
  );
  return Object.fromEntries(
    facetGroups.map((key, i) => [key, counts[i]]),
  ) as Record<string, Facet[]>;
}
