"use client"

import { LineChart, Line, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { formatMoney, formatDate } from "@/lib/format"

interface SparklineData {
  price: number
  currency: string
  fetched_at: string
}

interface PriceSparklineProps {
  data: SparklineData[]
  height?: number
}

export function PriceSparkline({ data, height = 120 }: PriceSparklineProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[120px] text-muted-foreground text-sm">
        No price history
      </div>
    )
  }

  const chartData = data.map((point) => ({
    price: point.price,
    date: new Date(point.fetched_at).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    fullDate: point.fetched_at,
  }))

  const minPrice = Math.min(...chartData.map((d) => d.price))
  const maxPrice = Math.max(...chartData.map((d) => d.price))
  const range = maxPrice - minPrice
  const domain = [minPrice - range * 0.1, maxPrice + range * 0.1]

  return (
    <ResponsiveContainer width="100%" height={height}>
      <LineChart data={chartData}>
        <XAxis
          dataKey="date"
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 12 }}
          className="text-muted-foreground"
        />
        <YAxis
          domain={domain}
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 12 }}
          className="text-muted-foreground"
          tickFormatter={(value) => `$${value.toFixed(0)}`}
        />
        <Tooltip
          content={({ active, payload }) => {
            if (active && payload && payload.length) {
              const data = payload[0].payload
              return (
                <div className="rounded-lg border bg-background p-2 shadow-sm">
                  <p className="font-semibold">{formatMoney(data.price, "USD")}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDate(data.fullDate)}
                  </p>
                </div>
              )
            }
            return null
          }}
        />
        <Line
          type="monotone"
          dataKey="price"
          stroke="hsl(var(--primary))"
          strokeWidth={2}
          dot={false}
          activeDot={{ r: 4 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}

