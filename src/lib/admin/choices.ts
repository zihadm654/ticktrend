import { db } from "@/db";
import { asc } from "drizzle-orm";
import { brands, features, collections } from "@/db/schema";
import { requireAdmin } from "./session";
export async function editorChoices() {
  await requireAdmin();
  const [b, f, c] = await Promise.all([
    db
      .select({ id: brands.id, name: brands.name, slug: brands.slug })
      .from(brands)
      .orderBy(asc(brands.name)),
    db
      .select({
        id: features.id,
        name: features.name,
        slug: features.slug,
        group: features.group,
      })
      .from(features)
      .orderBy(asc(features.group), asc(features.name)),
    db.select({ id: collections.id, name: collections.name }).from(collections),
  ]);
  return {
    brands: b,
    features: f,
    collections: c,
  };
}
