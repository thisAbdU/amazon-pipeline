import { Suspense } from "react"
import { notFound } from "next/navigation"
import { getProduct } from "@/lib/fetcher"
import { PriceSparkline } from "../../_components/price-sparkline"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { formatMoney, formatDate, getAvailabilityBadgeVariant } from "@/lib/format"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import Image from "next/image"
import { Skeleton } from "@/components/ui/skeleton"
import { CopyButton } from "./copy-button"

async function ProductDetail({ asin }: { asin: string }) {
  try {
    const product = await getProduct(asin)

    const sparklineData = product.sparkline.map((point) => ({
      price: point.price,
      currency: point.currency,
      fetched_at: point.fetched_at,
    }))

    // Copy function will be handled by client component if needed

    return (
      <div className="space-y-6">
        <div className="flex items-center gap-4">
          <Button variant="ghost" size="sm" asChild>
            <Link href="/products">
              <ArrowLeft className="h-4 w-4 mr-2" />
              Back to Products
            </Link>
          </Button>
        </div>

        <div className="grid gap-6 md:grid-cols-2">
          <Card>
            <CardHeader>
              <CardTitle>Product Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {product.image_url && (
                <div className="relative aspect-square w-full max-w-md mx-auto">
                  <Image
                    src={product.image_url}
                    alt={product.title}
                    fill
                    className="object-contain rounded-lg"
                  />
                </div>
              )}
              
              <div>
                <h1 className="text-2xl font-bold mb-2">{product.title}</h1>
                {product.brand && (
                  <p className="text-muted-foreground mb-2">Brand: {product.brand}</p>
                )}
                {product.category && (
                  <Badge variant="secondary" className="mr-2">{product.category}</Badge>
                )}
              </div>

              <div className="flex items-center gap-2">
                <span className="font-mono text-sm">{product.asin}</span>
                <CopyButton text={product.asin} />
              </div>

              {product.latest_offer && (
                <div className="space-y-2">
                  <div>
                    <span className="text-sm text-muted-foreground">Current Price: </span>
                    <span className="text-2xl font-bold">
                      {formatMoney(product.latest_offer.price, product.latest_offer.currency)}
                    </span>
                  </div>
                  <div>
                    <Badge variant={getAvailabilityBadgeVariant(product.latest_offer.availability)}>
                      {product.latest_offer.availability}
                    </Badge>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    <div>Seller: {product.latest_offer.seller}</div>
                    <div>Last updated: {formatDate(product.latest_offer.fetched_at)}</div>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Price History (Last 30 Days)</CardTitle>
            </CardHeader>
            <CardContent>
              <PriceSparkline data={sparklineData} />
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Additional Details</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-sm text-muted-foreground">Created</div>
              <div className="font-medium">{formatDate(product.created_at)}</div>
            </div>
            <div>
              <div className="text-sm text-muted-foreground">Last Updated</div>
              <div className="font-medium">{formatDate(product.updated_at)}</div>
            </div>
          </CardContent>
        </Card>
      </div>
    )
  } catch (error) {
    notFound()
  }
}

export default async function ProductDetailPage({
  params,
}: {
  params: { asin: string }
}) {
  return (
    <Suspense
      fallback={
        <div className="space-y-6">
          <Skeleton className="h-10 w-32" />
          <div className="grid gap-6 md:grid-cols-2">
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-32" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-64 w-full" />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <Skeleton className="h-6 w-48" />
              </CardHeader>
              <CardContent>
                <Skeleton className="h-64 w-full" />
              </CardContent>
            </Card>
          </div>
        </div>
      }
    >
      <ProductDetail asin={params.asin} />
    </Suspense>
  )
}
