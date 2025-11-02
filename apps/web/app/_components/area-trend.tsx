"use client"

import { AreaChart, Area, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"
import { formatMoney } from "@/lib/format"

interface TrendDataPoint {
  date: string
  avgPrice: number
}

interface AreaTrendProps {
  data: TrendDataPoint[]
  height?: number
}

export function AreaTrend({ data, height = 200 }: AreaTrendProps) {
  if (!data || data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[200px] text-muted-foreground text-sm">
        No trend data available
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={height}>
      <AreaChart data={data}>
        <defs>
          <linearGradient id="colorPrice" x1="0" y1="0" x2="0" y2="1">
            <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.3} />
            <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0} />
          </linearGradient>
        </defs>
        <XAxis
          dataKey="date"
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 12 }}
          className="text-muted-foreground"
        />
        <YAxis
          axisLine={false}
          tickLine={false}
          tick={{ fontSize: 12 }}
          className="text-muted-foreground"
          tickFormatter={(value) => `$${value.toFixed(0)}`}
        />
        <Tooltip
          content={({ active, payload }) => {
            if (active && payload && payload.length) {
              return (
                <div className="rounded-lg border bg-background p-2 shadow-sm">
                  <p className="font-semibold">{formatMoney(payload[0].value as number, "USD")}</p>
                  <p className="text-xs text-muted-foreground">{payload[0].payload.date}</p>
                </div>
              )
            }
            return null
          }}
        />
        <Area
          type="monotone"
          dataKey="avgPrice"
          stroke="hsl(var(--primary))"
          fill="url(#colorPrice)"
          strokeWidth={2}
        />
      </AreaChart>
    </ResponsiveContainer>
  )
}

