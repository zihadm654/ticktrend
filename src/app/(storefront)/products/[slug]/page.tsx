import Link from "next/link";
import { env } from "@/lib/env";
import { notFound } from "next/navigation";
import { getProduct, queryCatalog } from "@/lib/catalog/query";
import {
  ProductBuyBox,
  ProductGallery,
} from "@/components/storefront/product-details";
import { Markdown } from "@/components/storefront/markdown";
import { ProductCard } from "@/components/storefront/product-card";
import { label, featureGroups } from "@/lib/catalog/labels";
import { Breadcrumbs, SectionHead } from "@/components/storefront/ui";
import { ProductReviews } from "@/components/storefront/product-reviews";
import { RecentlyViewed } from "@/components/storefront/recently-viewed";
import { getRatingsFor } from "@/lib/reviews/server";
import { pageMetadata, absoluteUrl, jsonLd } from "@/lib/seo";
import { storeConfig } from "../../../../../store.config";
const conditionUrl = (condition: string) =>
  condition === "refurbished"
    ? "https://schema.org/RefurbishedCondition"
    : condition === "used" || condition === "open_box"
      ? "https://schema.org/UsedCondition"
      : "https://schema.org/NewCondition";
type Props = {
  params: Promise<{ slug: string }>;
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};
export async function generateMetadata({ params }: Props) {
  const p = await getProduct((await params).slug);
  return p
    ? pageMetadata(
        `${p.brand.name} ${p.name}`,
        `/products/${p.slug}`,
        p.description.slice(0, 160),
        p.images[0]?.url,
      )
    : {};
}
export default async function Product({ params, searchParams }: Props) {
  const p = await getProduct((await params).slug);
  if (!p) notFound();
  const reviewPage = Math.max(1, Math.min(50, Number((await searchParams).reviews) || 1));
  const [related, ratings] = await Promise.all([
    queryCatalog(
      {},
      {
        limit: 8,
        excludeId: p.id,
        related: { brandId: p.brandId, featureIds: p.features.map((f) => f.featureId) },
      },
    ),
    getRatingsFor([p.id]),
  ]);
  const rating = storeConfig.features.reviews ? (ratings.get(p.id) ?? { average: 0, count: 0 }) : null;
  const breadcrumb = [
    { name: "Home", url: "/" },
    { name: "Products", url: "/products" },
    { name: p.brand.name, url: `/brands/${p.brand.slug}` },
    { name: p.name, url: `/products/${p.slug}` },
  ];
  const structured = {
    "@context": "https://schema.org",
    "@type": "Product",
    name: p.name,
    description: p.description,
    image: p.images.map((i) => absoluteUrl(i.url)),
    brand: { "@type": "Brand", name: p.brand.name },
    ...(rating?.count
      ? {
          aggregateRating: {
            "@type": "AggregateRating",
            ratingValue: rating.average.toFixed(1),
            reviewCount: rating.count,
            bestRating: 5,
            worstRating: 1,
          },
        }
      : {}),
    offers: p.variants.map((v) => ({
      "@type": "Offer",
      sku: v.sku,
      name: v.optionLabel,
      url: absoluteUrl(`/products/${p.slug}`),
      priceCurrency: storeConfig.currency.code,
      price:
        storeConfig.currency.minorUnits === 0
          ? String(v.price)
          : `${Math.floor(v.price / 100)}.${String(v.price % 100).padStart(2, "0")}`,
      availability:
        v.stockQuantity > 0
          ? "https://schema.org/InStock"
          : "https://schema.org/OutOfStock",
      itemCondition: conditionUrl(p.condition),
    })),
  };
  return (
    <div className="store-width product-page">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: jsonLd(structured) }}
      />
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{
          __html: jsonLd({
            "@context": "https://schema.org",
            "@type": "BreadcrumbList",
            itemListElement: breadcrumb.map((b, i) => ({
              "@type": "ListItem",
              position: i + 1,
              name: b.name,
              item: absoluteUrl(b.url),
            })),
          }),
        }}
      />
      <Breadcrumbs
        items={[
          ["Home", "/"],
          ["Watches", "/products"],
          [p.brand.name, `/brands/${p.brand.slug}`],
          [p.name],
        ]}
      />
      <div className="product-layout">
        <ProductGallery images={p.images} name={p.name} />
        <ProductBuyBox product={p} rating={rating} />
      </div>
      <div className="product-info">
        <section className="panel product-about">
          <h2>About this watch</h2>
          <Markdown body={p.description.replace(/^##? [^\n]+\n*/, "")} ugc={env.DEMO_MODE} />
        </section>
        {p.features.length > 0 && (
          <section className="panel">
            <h2>Features</h2>
            <div className="feature-groups">
              {featureGroups.map((group) => {
                const items = p.features.filter((f) => f.feature.group === group);
                return items.length ? (
                  <div key={group} className="feature-group">
                    <p>
                      <strong>{label(group)}</strong>
                    </p>
                    <div className="chip-list">
                      {items.map((f) => (
                        <Link key={f.feature.id} className="chip link" href={`/products?feature=${f.feature.slug}`}>
                          {f.feature.name}
                        </Link>
                      ))}
                    </div>
                  </div>
                ) : null;
              })}
            </div>
          </section>
        )}
        <section className="panel product-specs">
          <h2>Specifications</h2>
          <dl className="spec-list">
            {(
              [
                ["Brand", p.brand.name],
                ["Brand type", label(p.brand.brandType)],
                ["Reference", p.referenceNo],
                ["Movement", label(p.movement)],
                ["Style", p.style ? label(p.style) : null],
                ["For whom", label(p.gender)],
                ["Case size", p.caseSizeMm !== null ? `${p.caseSizeMm} mm` : null],
                ["Case material", p.caseMaterial ? label(p.caseMaterial) : null],
                ["Strap", p.strapType ? label(p.strapType) : null],
                ["Glass", p.glass ? label(p.glass) : null],
                ["Dial colour", p.dialColor],
                ["Water resistance", p.waterResistanceM !== null ? `${p.waterResistanceM} m` : null],
                ["Condition", label(p.condition)],
                ["Warranty", p.warrantyMonths ? `${p.warrantyMonths} months` : null],
                ["Launch year", p.launchYear],
                ["Origin", p.countryOfOrigin],
              ] as [string, string | number | null][]
            )
              .filter(([, value]) => value !== null && value !== "")
              .map(([key, value]) => (
                <div key={key}>
                  <dt>{key}</dt>
                  <dd>{value}</dd>
                </div>
              ))}
          </dl>
        </section>
      </div>
      {storeConfig.features.reviews && (
        <ProductReviews product={{ id: p.id, name: p.name, slug: p.slug }} page={reviewPage} />
      )}
      {related.items.length > 0 && (
        <section className="section">
          <SectionHead title="You may also like" href={`/brands/${p.brand.slug}`} linkLabel={`More from ${p.brand.name}`} />
          <div className="product-grid related-grid">
            {related.items.slice(0, 4).map((product) => (
              <ProductCard key={product.id} product={product} />
            ))}
          </div>
        </section>
      )}
      {storeConfig.features.recentlyViewed && <RecentlyViewed currentId={p.id} />}
    </div>
  );
}
