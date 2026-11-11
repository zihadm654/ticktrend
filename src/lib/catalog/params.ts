import { z } from "@/lib/zod";
import {
  brandType,
  caseMaterial,
  condition,
  gender,
  movement,
  strapType,
} from "@/db/schema";
export { labels, label } from "./labels";

export type SearchParams = Record<string, string | string[] | undefined>;
const list = z.array(z.string().min(1).max(120)).max(100).default([]);
const enumList = <T extends readonly [string, ...string[]]>(values: T) =>
  z.array(z.enum(values)).max(100).default([]);
export const catalogParamsSchema = z.object({
  brand: list,
  brandType: enumList(brandType.enumValues),
  gender: enumList(gender.enumValues),
  movement: enumList(movement.enumValues),
  material: enumList(caseMaterial.enumValues),
  strap: enumList(strapType.enumValues),
  dial: list,
  glass: list,
  style: list,
  condition: enumList(condition.enumValues),
  feature: list,
  size: z
    .array(z.enum(["under-36", "36-40", "41-44", "45-plus"]))
    .max(100)
    .default([]),
  /** Minimum water resistance in metres. */
  water: z.number().int().min(0).max(10000).optional(),
  minPrice: z.number().int().min(0).max(2147483647).optional(),
  maxPrice: z.number().int().min(0).max(2147483647).optional(),
  inStock: z.boolean().default(false),
  deal: z.boolean().default(false),
  new: z.boolean().default(false),
  q: z.string().trim().max(160).default(""),
  sort: z
    .enum(["newest", "price-asc", "price-desc", "discount", "name"])
    .default("newest"),
  page: z.number().int().min(1).max(100000).default(1),
});
export type CatalogParams = z.infer<typeof catalogParamsSchema>;
export const listKeys = [
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
  "feature",
  "size",
] as const;
const numberKeys = ["page", "minPrice", "maxPrice", "water"] as const;
const booleanKeys = ["inStock", "deal", "new"] as const;
export function parseCatalogParams(
  raw: Record<string, unknown> = {},
): CatalogParams {
  const normalized: Record<string, unknown> = {};
  for (const key of Object.keys(catalogParamsSchema.shape)) {
    const value = raw[key];
    if (value === undefined || value === "") continue;
    if ((listKeys as readonly string[]).includes(key))
      normalized[key] = Array.isArray(value) ? value : [value];
    else if ((numberKeys as readonly string[]).includes(key))
      normalized[key] = Number(Array.isArray(value) ? value[0] : value);
    else if ((booleanKeys as readonly string[]).includes(key))
      normalized[key] = value === true || value === "true";
    else normalized[key] = Array.isArray(value) ? value[0] : value;
  }
  // Ignore malformed individual fields without discarding valid filters.
  for (const key of Object.keys(normalized)) {
    const field =
      catalogParamsSchema.shape[key as keyof typeof catalogParamsSchema.shape];
    if (!field.safeParse(normalized[key]).success) delete normalized[key];
  }
  return catalogParamsSchema.parse(normalized);
}
export function catalogHref(
  path: string,
  raw: Record<string, unknown>,
  changes: Record<string, unknown> = {},
) {
  const params = new URLSearchParams();
  for (const [key, value] of Object.entries({ ...raw, ...changes })) {
    if (
      value === undefined ||
      value === false ||
      value === "" ||
      value === null
    )
      continue;
    for (const item of Array.isArray(value) ? value : [value])
      params.append(key, String(item));
  }
  return `${path}${params.size ? `?${params}` : ""}`;
}
