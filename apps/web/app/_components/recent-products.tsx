"use client"

import { motion } from "framer-motion"
import Link from "next/link"
import { formatMoney, formatTimeAgo } from "@/lib/format"

interface Product {
  asin: string
  title: string
  latest_offer?: {
    price: number
    currency: string
    fetched_at: string
  }
}

interface RecentProductsProps {
  products: Product[]
}

export function RecentProducts({ products }: RecentProductsProps) {
  return (
    <div className="space-y-2">
      {products.map((product, index) => (
        <motion.div
          key={product.asin}
          initial={{ opacity: 0, x: -10 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.2, delay: index * 0.1 }}
        >
          <Link
            href={`/products/${product.asin}`}
            className="flex items-center justify-between p-3 rounded-lg hover:bg-muted transition-colors"
          >
            <div className="flex-1 min-w-0">
              <div className="font-medium truncate">{product.title}</div>
              <div className="text-sm text-muted-foreground">
                {product.latest_offer?.price && formatMoney(product.latest_offer.price)}
              </div>
            </div>
            <div className="text-xs text-muted-foreground ml-4">
              {product.latest_offer?.fetched_at && formatTimeAgo(product.latest_offer.fetched_at)}
            </div>
          </Link>
        </motion.div>
      ))}
    </div>
  )
}

