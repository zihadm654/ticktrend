import assert from "node:assert/strict";
import { before, after, test } from "node:test";
import { mkdtempSync, rmSync, readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { eq } from "drizzle-orm";
import { migrate } from "drizzle-orm/postgres-js/migrator";
import { hashPassword } from "better-auth/crypto";
import sharp from "sharp";
import * as s from "../src/db/schema";
import { productSchema, entitySchemas, safeUrl } from "../src/lib/admin/schema";
import { validateImage } from "../src/lib/storage/image";
import { localStorageAdapter } from "../src/lib/storage/local";
let database: typeof import("../src/db");
let catalog: typeof import("../src/lib/admin/catalog");
let auth: ReturnType<typeof import("../src/lib/auth").getAuth>;
let temporary: string;
const project = process.cwd();
before(async () => {
  temporary = mkdtempSync(join(tmpdir(), "ttf-admin-"));
  process.chdir(temporary);
  delete process.env.DATABASE_URL;
  Object.assign(process.env, { NODE_ENV: "test" });
  database = await import("../src/db");
  catalog = await import("../src/lib/admin/catalog");
  await migrate(database.db, {
    migrationsFolder: join(project, "src/db/migrations"),
  });
  await database.db
    .insert(s.brands)
    .values({
      id: "brand",
      name: "Fixture House",
      slug: "fixture-house",
      brandType: "local",
    });
  await database.db
    .insert(s.features)
    .values([
      {
        id: "feature-sapphire",
        name: "Sapphire crystal",
        slug: "sapphire-crystal",
        group: "case",
      },
      {
        id: "feature-date",
        name: "Date window",
        slug: "date-window",
        group: "complications",
      },
      {
        id: "feature-lume",
        name: "Luminous hands",
        slug: "luminous-hands",
        group: "display",
      },
    ]);
  await database.db
    .insert(s.user)
    .values({
      id: "admin",
      name: "Fixture Admin",
      email: "fixture@example.com",
      role: "admin",
    });
  await database.db
    .insert(s.account)
    .values({
      id: "credential",
      userId: "admin",
      accountId: "admin",
      providerId: "credential",
      password: await hashPassword("fixture-password"),
    });
  auth = (await import("../src/lib/auth")).getAuth();
});
after(async () => {
  await database?.closeDb();
  process.chdir(project);
  if (temporary) rmSync(temporary, { recursive: true, force: true });
});
const input = () => ({
  name: "Fixture Meridian",
  slug: `fixture-${crypto.randomUUID()}`,
  brandId: "brand",
  collectionName: "Harbor line",
  description: "Fictional test watch.",
  gender: "unisex",
  condition: "new",
  movement: "automatic",
  style: "dress",
  caseSizeMm: 40,
  caseMaterial: "stainless_steel",
  strapType: "leather",
  glass: "sapphire",
  waterResistanceM: 100,
  dialColor: "Midnight blue",
  referenceNo: "FX-4402",
  warrantyMonths: 24,
  launchYear: 2024,
  countryOfOrigin: "Japan",
  groundShippingOnly: false,
  isFeatured: false,
  isActive: true,
  variants: [
    {
      sku: `sku-${crypto.randomUUID()}`,
      optionLabel: "Midnight blue · leather strap",
      retailPrice: 20000,
      price: 18000,
      stockQuantity: 6,
      barcode: "8901234567890",
      isDefault: true,
      isActive: true,
    },
    {
      sku: `sku-${crypto.randomUUID()}`,
      optionLabel: "Silver · steel bracelet",
      retailPrice: 22000,
      price: 22000,
      stockQuantity: 4,
      barcode: null,
      isDefault: false,
      isActive: true,
    },
  ],
  images: [{ url: "/seed/test.svg", alt: "Fixture watch" }],
  featureIds: ["feature-sapphire", "feature-date"],
});
test("product validation accepts a watch with two options and feature ids", () => {
  const p = input();
  const parsed = productSchema.safeParse(p);
  assert.ok(parsed.success, JSON.stringify(parsed.error?.issues));
  assert.equal(parsed.data.variants.length, 2);
  assert.equal(parsed.data.variants[0].optionLabel, "Midnight blue · leather strap");
  assert.deepEqual(parsed.data.featureIds, ["feature-sapphire", "feature-date"]);
  assert.equal(parsed.data.caseSizeMm, 40);
});
test("product validation rejects fractional money, excess prices and broken options", () => {
  const p = input();
  const issue = (value: unknown) => {
    const result = productSchema.safeParse(value);
    assert.equal(result.success, false);
    return result.error!.issues.map((i) => `${i.path.join(".")}:${i.message}`);
  };
  // Fractional money never enters the integer-minor-unit column.
  assert.ok(
    issue({
      ...p,
      variants: [{ ...p.variants[0], price: 1.5 }, p.variants[1]],
    }).some((i) => i.startsWith("variants.0.price")),
  );
  // A selling price above retail is rejected against the offending option.
  assert.ok(
    issue({
      ...p,
      variants: [{ ...p.variants[0], price: 20001 }, p.variants[1]],
    }).some((i) => i.startsWith("variants.0.price:Price cannot exceed retail")),
  );
  assert.ok(issue({ ...p, variants: p.variants.map((v) => ({ ...v, isDefault: false })) }).some((i) => i.includes("Choose exactly one default option.")));
  assert.ok(issue({ ...p, variants: p.variants.map((v) => ({ ...v, isDefault: true })) }).some((i) => i.includes("Choose exactly one default option.")));
  assert.ok(
    issue({
      ...p,
      variants: [{ ...p.variants[0], isActive: false }, p.variants[1]],
    }).some((i) => i.includes("The default option must be active.")),
  );
  assert.ok(
    issue({ ...p, variants: [{ ...p.variants[0] }, { ...p.variants[1], sku: p.variants[0].sku }] }).some((i) =>
      i.includes("SKUs must be unique."),
    ),
  );
  assert.equal(productSchema.safeParse({ ...p, variants: [] }).success, false);
  assert.equal(productSchema.safeParse({ ...p, featureIds: undefined }).success, false);
});
test("a draft watch may keep an inactive default option", () => {
  const p = input();
  const draft = {
    ...p,
    isActive: false,
    variants: [{ ...p.variants[0], isActive: false }, p.variants[1]],
  };
  assert.equal(productSchema.safeParse(draft).success, true);
});

test("feature taxonomy validation accepts grouped watch features", () => {
  assert.equal(
    entitySchemas.features.safeParse({
      name: "Screw-down crown",
      slug: "screw-down-crown",
      group: "durability",
    }).success,
    true,
  );
  assert.equal(
    entitySchemas.features.safeParse({ name: "X", slug: "x", group: "invalid-group" }).success,
    false,
  );
});
test("content validation rejects unsafe URLs and broken schedules", () => {
  for (const url of ["javascript:alert(1)", "//evil.test", "/\\evil.test"])
    assert.equal(safeUrl.safeParse(url).success, false);
  assert.equal(
    entitySchemas.banners.safeParse({
      placement: "hero",
      title: "A",
      subtitle: null,
      imageUrl: null,
      href: "/products",
      ctaLabel: null,
      sortOrder: 0,
      isActive: true,
      startsAt: "2026-10-02",
      endsAt: "2026-10-01",
    }).success,
    false,
  );
});
test("a watch saves with both options and its features, then reloads intact", async () => {
  const p = input();
  const id = await catalog.saveProductRecord(undefined, p);
  const reload = () =>
    database.db.query.products.findFirst({
      where: eq(s.products.id, id),
      with: { variants: true, images: true, features: true },
    });
  const saved = await reload();
  assert.equal(saved?.movement, "automatic");
  assert.equal(saved?.condition, "new");
  assert.equal(saved?.style, "dress");
  assert.equal(saved?.caseSizeMm, 40);
  assert.equal(saved?.caseMaterial, "stainless_steel");
  assert.equal(saved?.strapType, "leather");
  assert.equal(saved?.glass, "sapphire");
  assert.equal(saved?.waterResistanceM, 100);
  assert.equal(saved?.dialColor, "Midnight blue");
  assert.equal(saved?.referenceNo, "FX-4402");
  assert.equal(saved?.warrantyMonths, 24);
  assert.equal(saved?.launchYear, 2024);
  assert.equal(saved?.countryOfOrigin, "Japan");
  assert.deepEqual(
    saved?.variants.map((v) => [v.optionLabel, v.price, v.stockQuantity, v.isDefault]).sort(),
    [
      ["Midnight blue · leather strap", 18000, 6, true],
      ["Silver · steel bracelet", 22000, 4, false],
    ],
  );
  assert.deepEqual(
    saved?.features.map((f) => f.featureId).sort(),
    ["feature-date", "feature-sapphire"],
  );
  // Feature selection is replaced, not appended.
  await catalog.saveProductRecord(id, {
    ...p,
    featureIds: ["feature-lume"],
    variants: p.variants.map((v) => {
      const stored = saved!.variants.find((row) => row.sku === v.sku)!;
      return { ...v, id: stored.id, expectedStock: stored.stockQuantity };
    }),
  });
  assert.deepEqual(
    (await reload())?.features.map((f) => f.featureId),
    ["feature-lume"],
  );
});
test("product saves preserve option IDs, reject stock drift and roll back all edits", async () => {
  const p = input();
  const id = await catalog.saveProductRecord(undefined, p);
  const stored = await database.db
    .select()
    .from(s.productVariants)
    .where(eq(s.productVariants.productId, id));
  const defaultOption = stored.find((v) => v.isDefault)!;
  // Both options must be sent back so the edit keeps the full set.
  const payload = (name: string, expectedDefaultStock: number) => ({
    ...p,
    name,
    variants: p.variants.map((v) => {
      const row = stored.find((o) => o.sku === v.sku)!;
      return {
        ...v,
        id: row.id,
        expectedStock: row.id === defaultOption.id ? expectedDefaultStock : row.stockQuantity,
      };
    }),
  });
  await catalog.saveProductRecord(id, payload("Edited fixture", 6));
  const afterEdit = await database.db
    .select()
    .from(s.productVariants)
    .where(eq(s.productVariants.productId, id));
  assert.deepEqual(afterEdit.map((v) => v.id).sort(), stored.map((v) => v.id).sort());
  assert.equal(afterEdit.find((v) => v.isDefault)?.id, defaultOption.id);
  await database.db
    .update(s.productVariants)
    .set({ stockQuantity: 5 })
    .where(eq(s.productVariants.id, defaultOption.id));
  await assert.rejects(
    catalog.saveProductRecord(id, payload("Should roll back", 6)),
    /Stock changed/,
  );
  assert.equal(
    (
      await database.db.select().from(s.products).where(eq(s.products.id, id))
    )[0].name,
    "Edited fixture",
  );
  assert.equal(
    (
      await database.db
        .select()
        .from(s.productVariants)
        .where(eq(s.productVariants.id, defaultOption.id))
    )[0].stockQuantity,
    5,
  );
});
test("an editor cannot move an option from another product", async () => {
  const p = input();
  const a = await catalog.saveProductRecord(undefined, p);
  const b = await catalog.saveProductRecord(undefined, input());
  const [v] = await database.db
    .select()
    .from(s.productVariants)
    .where(eq(s.productVariants.productId, a));
  await assert.rejects(
    catalog.saveProductRecord(b, {
      ...input(),
      variants: [{ ...v, expectedStock: v.stockQuantity }],
    }),
    /does not belong/,
  );
});
test("uploads decode bytes, reject spoofed MIME and enforce image size", async () => {
  const png = await sharp({
    create: { width: 2000, height: 500, channels: 3, background: "#cccccc" },
  })
    .png()
    .toBuffer();
  const converted = await validateImage(png, "image/png");
  const meta = await sharp(converted).metadata();
  assert.equal(meta.format, "webp");
  assert.equal(meta.width, 1600);
  await assert.rejects(validateImage(png, "image/jpeg"));
  await assert.rejects(validateImage(Buffer.from("<svg/>"), "image/svg+xml"));
  await assert.rejects(
    validateImage(new Uint8Array(5 * 1024 * 1024 + 1), "image/png"),
  );
  const url = await localStorageAdapter.putObject(converted, "test-image.webp");
  assert.equal(url, "/uploads/test-image.webp");
  assert.ok(
    readFileSync(join(temporary, ".data/uploads/test-image.webp")).length,
  );
  // Served by a route, because production servers ignore files added to public/ after build.
  const { GET } = await import("../src/app/uploads/[key]/route");
  const serve = (key: string) => GET(new Request("http://x/uploads/" + key), { params: Promise.resolve({ key }) });
  const served = await serve("test-image.webp");
  assert.equal(served.status, 200);
  assert.equal(served.headers.get("content-type"), "image/webp");
  assert.equal((await served.arrayBuffer()).byteLength, converted.length);
  for (const bad of ["../secret.webp", "..%2Fsecret.webp", "missing.webp", "x.svg"])
    assert.equal((await serve(bad)).status, 404, bad);
  await assert.rejects(localStorageAdapter.deleteObject("../secret"));
  await localStorageAdapter.deleteObject("test-image.webp");
  assert.equal((await serve("test-image.webp")).status, 404);
});
test("Better Auth signs in seeded credentials, rejects signup and revokes logout sessions", async () => {
  const origin = "http://localhost:3000";
  const req = (path: string, body: unknown, cookie?: string) =>
    auth.handler(
      new Request(origin + "/api/auth" + path, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Origin: origin,
          ...(cookie ? { Cookie: cookie } : {}),
        },
        body: JSON.stringify(body),
      }),
    );
  const signup = await req("/sign-up/email", {
    name: "Intruder",
    email: "new@example.com",
    password: "password1234",
  });
  assert.ok(signup.status >= 400);
  const login = await req("/sign-in/email", {
    email: "fixture@example.com",
    password: "fixture-password",
  });
  assert.equal(login.status, 200);
  const cookie = login.headers
    .getSetCookie()
    .map((c) => c.split(";")[0])
    .join("; ");
  assert.ok(cookie.includes("session_token"));
  const session = await auth.api.getSession({
    headers: new Headers({ Cookie: cookie }),
  });
  assert.equal(session?.user.role, "admin");
  await req("/sign-out", {}, cookie);
  assert.equal(
    await auth.api.getSession({ headers: new Headers({ Cookie: cookie }) }),
    null,
  );
});
test("admin sign-in is rate limited per client address", async () => {
  const origin = "http://localhost:3000";
  const attempt = () =>
    auth.handler(
      new Request(origin + "/api/auth/sign-in/email", {
        method: "POST",
        headers: { "Content-Type": "application/json", Origin: origin, "x-forwarded-for": "198.51.100.7" },
        body: JSON.stringify({ email: "fixture@example.com", password: "wrong-password" }),
      }),
    );
  const statuses: number[] = [];
  for (let i = 0; i < 6; i += 1) statuses.push((await attempt()).status);
  assert.ok(statuses.slice(0, 5).every((status) => status === 401), statuses.join());
  assert.equal(statuses[5], 429);
});
test("every exported admin Server Action verifies the session first", () => {
  const source = readFileSync(join(project, "src/lib/admin/actions.ts"), "utf8");
  const bodies = source.split(/^export async function /m).slice(1);
  assert.ok(bodies.length >= 13);
  for (const body of bodies) {
    const name = body.slice(0, body.indexOf("("));
    const first = body.slice(body.indexOf("{", body.indexOf(")")) + 1).trim().split("\n")[0];
    assert.match(first, /^(const \w+ = )?await requireAdmin\(\);$/, `${name} must start with requireAdmin()`);
  }
});
test("public Server Action modules are the reviewed set", () => {
  // A new "use server" module is a new public endpoint: review its auth, Zod
  // validation and rate limits (docs/PHASE_6_VERIFICATION.md), then add it here.
  const reviewed = [
    "src/lib/admin/actions.ts",
    "src/lib/cart/actions.ts",
    "src/lib/catalog/actions.ts",
    "src/lib/checkout/actions.ts",
    "src/lib/demo/actions.ts",
    "src/lib/reviews/actions.ts",
  ];
  const found = readdirSync(join(project, "src"), { recursive: true, encoding: "utf8" })
    .filter((file) => /\.tsx?$/.test(file))
    .map((file) => join("src", file).replaceAll("\\", "/"))
    .filter((file) => /^\s*["']use server["']/.test(readFileSync(join(project, file), "utf8")))
    .sort();
  assert.deepEqual(found, reviewed);
});
