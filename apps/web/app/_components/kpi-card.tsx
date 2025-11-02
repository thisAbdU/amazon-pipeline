"use client"

import { useEffect, useRef, useState } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { 
  Package, TrendingUp, DollarSign, CheckCircle, 
  type LucideIcon 
} from "lucide-react"
import { motion, useInView } from "framer-motion"

// Icon mapping
const iconMap: Record<string, LucideIcon> = {
  Package,
  TrendingUp,
  DollarSign,
  CheckCircle,
}

interface KPICardProps {
  title: string
  value: string | number
  delta?: string
  icon: string // Icon name as string
  description?: string
}

export function KPICard({ title, value, delta, icon, description }: KPICardProps) {
  const Icon = iconMap[icon] || Package
  const ref = useRef<HTMLDivElement>(null)
  const isInView = useInView(ref, { once: true })
  const [displayValue, setDisplayValue] = useState<string | number>(typeof value === "number" ? 0 : value)
  
  useEffect(() => {
    if (isInView && typeof value === "number") {
      let start = 0
      const end = value
      const duration = 1000
      const startTime = Date.now()
      
      const animate = () => {
        const now = Date.now()
        const elapsed = now - startTime
        const progress = Math.min(elapsed / duration, 1)
        
        const current = Math.floor(start + (end - start) * progress)
        setDisplayValue(current)
        
        if (progress < 1) {
          requestAnimationFrame(animate)
        } else {
          setDisplayValue(end)
        }
      }
      
      animate()
    } else if (isInView) {
      setDisplayValue(value)
    }
  }, [isInView, value])

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: 20 }}
      animate={isInView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.3 }}
    >
      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
          <CardTitle className="text-sm font-medium">{title}</CardTitle>
          <Icon className="h-4 w-4 text-muted-foreground" />
        </CardHeader>
        <CardContent>
          <div className="text-2xl font-bold">{displayValue}</div>
          {delta && (
            <p className="text-xs text-muted-foreground mt-1">{delta}</p>
          )}
          {description && (
            <p className="text-xs text-muted-foreground mt-1">{description}</p>
          )}
        </CardContent>
      </Card>
    </motion.div>
  )
}

