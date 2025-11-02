import { Suspense } from "react"
import { getProducts } from "@/lib/fetcher"
import { ProductsTable } from "../_components/products-table"
import { Filters } from "../_components/filters"
import { EmptyState } from "../_components/empty-state"
import { TableSkeleton } from "../_components/skeletons"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { ChevronLeft, ChevronRight } from "lucide-react"

async function ProductsList({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  const search = typeof searchParams.q === "string" ? searchParams.q : undefined
  const brand = typeof searchParams.brand === "string" ? searchParams.brand : undefined
  const category = typeof searchParams.category === "string" ? searchParams.category : undefined
  const minPrice = typeof searchParams.min_price === "string" ? parseFloat(searchParams.min_price) : undefined
  const maxPrice = typeof searchParams.max_price === "string" ? parseFloat(searchParams.max_price) : undefined
  const inStock = searchParams.in_stock === "true"
  const limit = typeof searchParams.limit === "string" ? parseInt(searchParams.limit, 10) : 50
  const offset = typeof searchParams.offset === "string" ? parseInt(searchParams.offset, 10) : 0

  const data = await getProducts({
    search,
    brand,
    category,
    min_price: minPrice,
    max_price: maxPrice,
    in_stock: inStock,
    limit,
    offset,
  })

  const products = data.products

  // Extract unique brands and categories for filters
  const brands = Array.from(new Set(products.map((p) => p.brand).filter(Boolean))) as string[]
  const categories = Array.from(new Set(products.map((p) => p.category).filter(Boolean))) as string[]

  const nextOffset = offset + limit
  const prevOffset = Math.max(0, offset - limit)
  const hasNext = products.length === limit
  const hasPrev = offset > 0

  const getPageUrl = (newOffset: number) => {
    const params = new URLSearchParams()
    if (search) params.set("q", search)
    if (brand) params.set("brand", brand)
    if (category) params.set("category", category)
    if (minPrice) params.set("min_price", minPrice.toString())
    if (maxPrice) params.set("max_price", maxPrice.toString())
    if (inStock) params.set("in_stock", "true")
    params.set("limit", limit.toString())
    params.set("offset", newOffset.toString())
    return `/products?${params.toString()}`
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Products</h1>
        <p className="text-muted-foreground">
          Browse and filter your product catalog
        </p>
      </div>

      <Filters brands={brands} categories={categories} />

      {products.length === 0 ? (
        <EmptyState
          title="No products found"
          description="Try adjusting your filters or check back later."
          action={{
            label: "Reset Filters",
            href: "/products",
          }}
        />
      ) : (
        <>
          <ProductsTable products={products} />
          
          <div className="flex items-center justify-between">
            <div className="text-sm text-muted-foreground">
              Showing {offset + 1}-{offset + products.length} of {products.length} products
            </div>
            <div className="flex gap-2">
              <Button
                variant="outline"
                size="sm"
                disabled={!hasPrev}
                asChild
              >
                <Link href={getPageUrl(prevOffset)}>
                  <ChevronLeft className="h-4 w-4 mr-1" />
                  Previous
                </Link>
              </Button>
              <Button
                variant="outline"
                size="sm"
                disabled={!hasNext}
                asChild
              >
                <Link href={getPageUrl(nextOffset)}>
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Link>
              </Button>
            </div>
          </div>
        </>
      )}
    </div>
  )
}

export default async function ProductsPage({
  searchParams,
}: {
  searchParams: { [key: string]: string | string[] | undefined }
}) {
  return (
    <Suspense fallback={<TableSkeleton />}>
      <ProductsList searchParams={searchParams} />
    </Suspense>
  )
}
