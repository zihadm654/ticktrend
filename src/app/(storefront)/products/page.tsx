import { ProductListing } from "@/components/storefront/product-listing";
import { pageMetadata } from "@/lib/seo";
import type { SearchParams } from "@/lib/catalog/params";
export const metadata = pageMetadata("All watches", "/products");
export default async function Products({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  return (
    <ProductListing
      title="All watches"
      path="/products"
      searchParams={await searchParams}
    />
  );
}
