import { z } from "@/lib/zod";
import {
  bannerPlacement,
  brandType,
  caseMaterial,
  condition,
  couponType,
  featureGroup,
  gender,
  homepageSectionType,
  movement,
  strapType,
} from "@/db/schema";
import { catalogParamsSchema } from "@/lib/catalog/params";
import { COUPON_CODE_MAX, normalizeCouponCode } from "@/lib/coupons/rules";
const text = z.string().trim().max(500);
export const slugSchema = z
  .string()
  .regex(
    /^[a-z0-9]+(?:-[a-z0-9]+)*$/,
    "Use lowercase letters, numbers and hyphens.",
  )
  .max(160);
export const safeUrl = z
  .string()
  .max(2000)
  .refine(
    (s) => !s || /^(https?:\/\/[^\s]+|\/(?!\/)[^\s\\]*)$/.test(s),
    "Use an http(s) URL or a local path.",
  );
const integer = z.number().int().min(0).max(2147483647);
const optionalText = text.nullable();
const description = z.string().max(30000);
/** One purchasable dial/strap combination. */
export const variantSchema = z
  .object({
    id: z.string().optional(),
    sku: z.string().trim().min(1).max(120),
    optionLabel: optionalText,
    retailPrice: integer,
    price: integer,
    stockQuantity: integer,
    expectedStock: integer.optional(),
    barcode: optionalText,
    isDefault: z.boolean(),
    isActive: z.boolean(),
  })
  .refine((v) => v.price <= v.retailPrice, {
    path: ["price"],
    message: "Price cannot exceed retail price.",
  });
export const productSchema = z
  .object({
    name: text.min(1),
    slug: slugSchema,
    brandId: z.string().min(1),
    collectionName: optionalText,
    description,
    gender: z.enum(gender.enumValues),
    condition: z.enum(condition.enumValues),
    movement: z.enum(movement.enumValues),
    style: optionalText,
    caseSizeMm: z.number().int().min(1).max(200).nullable(),
    caseMaterial: z.enum(caseMaterial.enumValues).nullable(),
    strapType: z.enum(strapType.enumValues).nullable(),
    glass: optionalText,
    waterResistanceM: integer.nullable(),
    dialColor: optionalText,
    referenceNo: optionalText,
    warrantyMonths: integer.nullable(),
    launchYear: z.number().int().min(1700).max(2200).nullable(),
    countryOfOrigin: optionalText,
    groundShippingOnly: z.boolean(),
    isFeatured: z.boolean(),
    isActive: z.boolean(),
    variants: z.array(variantSchema).min(1).max(50),
    images: z
      .array(z.object({ url: safeUrl.min(1), alt: text.min(1) }))
      .max(20),
    featureIds: z.array(z.string().min(1).max(100)).max(180),
  })
  .superRefine((p, ctx) => {
    if (p.variants.filter((v) => v.isDefault).length !== 1)
      ctx.addIssue({
        code: "custom",
        path: ["variants"],
        message: "Choose exactly one default option.",
      });
    if (new Set(p.variants.map((v) => v.sku)).size !== p.variants.length)
      ctx.addIssue({
        code: "custom",
        path: ["variants"],
        message: "SKUs must be unique.",
      });
    if (p.isActive && !p.variants.some((v) => v.isDefault && v.isActive))
      ctx.addIssue({
        code: "custom",
        path: ["variants"],
        message: "The default option must be active.",
      });
  });
const sectionConfig = z.object({
  source: z.enum(["featured", "new", "deals", "collection"]).optional(),
  collectionId: z.string().optional(),
  limit: z.number().int().min(1).max(24).optional(),
  tiles: z
    .array(
      z.object({
        title: text.min(1),
        href: safeUrl.min(1),
        imageUrl: safeUrl.min(1),
      }),
    )
    .max(24)
    .optional(),
  items: z
    .array(
      z.object({
        icon: z.enum(["shield-check", "phone", "truck", "message-circle"]),
        title: text.min(1),
        description: text,
      }),
    )
    .max(12)
    .optional(),
  imageUrl: safeUrl.optional(),
  href: safeUrl.optional(),
  ctaLabel: text.optional(),
});
export const entitySchemas = {
  brands: z.object({
    name: text.min(1),
    slug: slugSchema,
    brandType: z.enum(brandType.enumValues),
    logoUrl: safeUrl.nullable(),
    heroImageUrl: safeUrl.nullable(),
    description: description.nullable(),
    isFeatured: z.boolean(),
    sortOrder: integer,
  }),
  features: z.object({
    name: text.min(1),
    slug: slugSchema,
    group: z.enum(featureGroup.enumValues),
  }),
  collections: z.object({
    name: text.min(1),
    slug: slugSchema,
    description: description.nullable(),
    heroImageUrl: safeUrl.nullable(),
    filterJson: catalogParamsSchema.omit({ page: true, new: true }),
    isActive: z.boolean(),
    sortOrder: integer,
  }),
  banners: z
    .object({
      placement: z.enum(bannerPlacement.enumValues),
      title: optionalText,
      subtitle: optionalText,
      imageUrl: safeUrl.nullable(),
      href: safeUrl.nullable(),
      ctaLabel: optionalText,
      sortOrder: integer,
      isActive: z.boolean(),
      startsAt: z.coerce.date().nullable(),
      endsAt: z.coerce.date().nullable(),
    })
    .refine((v) => !v.startsAt || !v.endsAt || v.endsAt > v.startsAt, {
      path: ["endsAt"],
      message: "End must follow start.",
    }),
  homepage: z
    .object({
      type: z.enum(homepageSectionType.enumValues),
      title: optionalText,
      subtitle: optionalText,
      config: sectionConfig,
      sortOrder: integer,
      isActive: z.boolean(),
    })
    .refine(
      (s) =>
        !(
          s.type === "collection_banner" ||
          (s.type === "product_carousel" && s.config.source === "collection")
        ) || Boolean(s.config.collectionId),
      { path: ["config"], message: "Choose a collection." },
    ),
  pages: z.object({
    slug: slugSchema,
    title: text.min(1),
    body: description,
    isActive: z.boolean(),
  }),
  customers: z.object({
    internalNote: z.string().max(5000).nullable(),
    tags: z.array(z.string().trim().min(1).max(60)).max(20),
    isBlocked: z.boolean(),
  }),
};
export const couponSchema = z
  .object({
    code: z
      .string()
      .transform(normalizeCouponCode)
      .pipe(
        z
          .string()
          .min(3, "Use at least 3 characters.")
          .max(COUPON_CODE_MAX)
          .regex(/^[A-Z0-9_-]+$/, "Use letters, numbers, hyphens or underscores."),
      ),
    type: z.enum(couponType.enumValues),
    value: integer.positive("Enter a value above zero."),
    minSubtotal: integer.nullable(),
    maxUses: integer.positive("Use a limit of at least 1, or leave it empty.").nullable(),
    startsAt: z.coerce.date().nullable(),
    endsAt: z.coerce.date().nullable(),
    isActive: z.boolean(),
  })
  .superRefine((c, ctx) => {
    if (c.type === "percent" && c.value > 100)
      ctx.addIssue({ code: "custom", path: ["value"], message: "A percentage can't exceed 100." });
    if (c.startsAt && c.endsAt && c.endsAt <= c.startsAt)
      ctx.addIssue({ code: "custom", path: ["endsAt"], message: "End must follow start." });
  });
export type CouponInput = z.input<typeof couponSchema>;
/** Record IDs arriving as Server Action arguments. */
export const idSchema = z.string().min(1).max(100);
export const idListSchema = z.array(idSchema).min(1).max(200);
export type Entity = keyof typeof entitySchemas;
export type ProductInput = z.infer<typeof productSchema>;
export type ActionResult = {
  ok: boolean;
  message: string;
  id?: string;
  errors?: Record<string, string>;
};
export function validationFailure(error: z.ZodError): ActionResult {
  return {
    ok: false,
    message: "Check the highlighted fields.",
    errors: Object.fromEntries(
      error.issues.map((i) => [i.path.join("."), i.message]),
    ),
  };
}
