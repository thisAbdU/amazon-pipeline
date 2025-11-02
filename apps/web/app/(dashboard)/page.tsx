import { Suspense } from "react"
import { getProducts } from "@/lib/fetcher"
import { KPICard } from "../_components/kpi-card"
import { AreaTrend } from "../_components/area-trend"
import { RecentProducts } from "../_components/recent-products"
import { KPISkeleton, ChartSkeleton } from "../_components/skeletons"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatMoney } from "@/lib/format"

async function OverviewData() {
  const data = await getProducts({ limit: 100 })
  const products = data.products

  const totalProducts = products.length
  const inStockCount = products.filter((p) => 
    p.latest_offer?.availability?.toLowerCase().includes("stock") ||
    p.latest_offer?.availability?.toLowerCase().includes("available")
  ).length
  const inStockPercent = totalProducts > 0 ? Math.round((inStockCount / totalProducts) * 100) : 0

  const prices = products
    .map((p) => p.latest_offer?.price)
    .filter((p): p is number => p !== undefined && p !== null)

  const medianPrice = prices.length > 0
    ? prices.sort((a, b) => a - b)[Math.floor(prices.length / 2)]
    : 0

  const avgPrice = prices.length > 0
    ? prices.reduce((a, b) => a + b, 0) / prices.length
    : 0

  // Generate 30-day trend data (mock aggregation by day)
  const trendData = Array.from({ length: 30 }, (_, i) => {
    const date = new Date()
    date.setDate(date.getDate() - (29 - i))
    return {
      date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      avgPrice: avgPrice + (Math.random() * avgPrice * 0.1 - avgPrice * 0.05),
    }
  })

  const recentProducts = products
    .sort((a, b) => {
      const aTime = a.latest_offer?.fetched_at ? new Date(a.latest_offer.fetched_at).getTime() : 0
      const bTime = b.latest_offer?.fetched_at ? new Date(b.latest_offer.fetched_at).getTime() : 0
      return bTime - aTime
    })
    .slice(0, 5)

  return (
    <>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
        <KPICard
          title="Total Products"
          value={totalProducts}
          icon="Package"
        />
        <KPICard
          title="In Stock"
          value={`${inStockPercent}%`}
          delta={`${inStockCount} of ${totalProducts} products`}
          icon="CheckCircle"
        />
        <KPICard
          title="Median Price"
          value={formatMoney(medianPrice)}
          icon="TrendingUp"
        />
        <KPICard
          title="Average Price"
          value={formatMoney(avgPrice)}
          icon="DollarSign"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 mb-6">
        <Card>
          <CardHeader>
            <CardTitle>30-Day Price Trend</CardTitle>
          </CardHeader>
          <CardContent>
            <AreaTrend data={trendData} />
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Recently Updated</CardTitle>
          </CardHeader>
          <CardContent>
            <RecentProducts products={recentProducts} />
          </CardContent>
        </Card>
      </div>
    </>
  )
}

export default function DashboardPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
        <p className="text-muted-foreground">
          Overview of your Amazon product pipeline
        </p>
      </div>

      <Suspense
        fallback={
          <>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4 mb-6">
              {Array.from({ length: 4 }).map((_, i) => (
                <KPISkeleton key={i} />
              ))}
            </div>
            <ChartSkeleton />
          </>
        }
      >
        <OverviewData />
      </Suspense>
    </div>
  )
}

