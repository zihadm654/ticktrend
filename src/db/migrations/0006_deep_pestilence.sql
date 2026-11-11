CREATE TYPE "public"."case_material" AS ENUM('stainless_steel', 'alloy', 'titanium', 'gold_plated', 'plastic');--> statement-breakpoint
CREATE TYPE "public"."movement" AS ENUM('quartz', 'automatic', 'mechanical', 'solar', 'digital');--> statement-breakpoint
CREATE TYPE "public"."strap_type" AS ENUM('leather', 'steel', 'mesh', 'rubber', 'silicone', 'fabric');--> statement-breakpoint
ALTER TABLE "product_variants" DROP CONSTRAINT "variants_size_check";--> statement-breakpoint
ALTER TABLE "brands" ALTER COLUMN "brand_type" SET DATA TYPE text;--> statement-breakpoint
DROP TYPE "public"."brand_type";--> statement-breakpoint
CREATE TYPE "public"."brand_type" AS ENUM('imported', 'mastercopy', 'firstcopy', 'local');--> statement-breakpoint
ALTER TABLE "brands" ALTER COLUMN "brand_type" SET DATA TYPE "public"."brand_type" USING "brand_type"::"public"."brand_type";--> statement-breakpoint
DROP INDEX "variants_size_idx";--> statement-breakpoint
DROP INDEX "products_concentration_idx";--> statement-breakpoint
DROP INDEX "products_family_idx";--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "movement" "movement" NOT NULL;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "style" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "case_size_mm" integer;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "case_material" "case_material";--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "strap_type" "strap_type";--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "glass" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "water_resistance_m" integer;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "dial_color" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "reference_no" text;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "warranty_months" integer;--> statement-breakpoint
ALTER TABLE "products" ADD COLUMN "features" text[] DEFAULT '{}'::text[] NOT NULL;--> statement-breakpoint
CREATE INDEX "products_movement_idx" ON "products" USING btree ("movement");--> statement-breakpoint
CREATE INDEX "products_style_idx" ON "products" USING btree ("style");--> statement-breakpoint
CREATE INDEX "products_case_size_idx" ON "products" USING btree ("case_size_mm");--> statement-breakpoint
ALTER TABLE "product_variants" DROP COLUMN "size_ml";--> statement-breakpoint
ALTER TABLE "products" DROP COLUMN "concentration";--> statement-breakpoint
ALTER TABLE "products" DROP COLUMN "fragrance_family";--> statement-breakpoint
ALTER TABLE "products" DROP COLUMN "perfumer";--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_caseSize_Mm_check" CHECK ("products"."case_size_mm" IS NULL OR "products"."case_size_mm" > 0);--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_water_check" CHECK ("products"."water_resistance_m" IS NULL OR "products"."water_resistance_m" >= 0);--> statement-breakpoint
ALTER TABLE "products" ADD CONSTRAINT "products_warrantyMonths_check" CHECK ("products"."warranty_months" IS NULL OR "products"."warranty_months" >= 0);--> statement-breakpoint
DROP TYPE "public"."concentration";