"use client"

import { useState } from "react"
import Link from "next/link"
import Image from "next/image"
import { formatMoney, formatTimeAgo, getAvailabilityBadgeVariant } from "@/lib/format"
import { Badge } from "@/components/ui/badge"
import { motion } from "framer-motion"

interface Product {
  asin: string
  title: string
  brand?: string
  category?: string
  image_url?: string
  latest_offer?: {
    price: number
    currency: string
    availability: string
    seller: string
    fetched_at: string
  }
}

interface ProductsTableProps {
  products: Product[]
}

export function ProductsTable({ products }: ProductsTableProps) {
  const [sortColumn, setSortColumn] = useState<keyof Product | null>(null)
  const [sortDirection, setSortDirection] = useState<"asc" | "desc">("asc")

  const handleSort = (column: keyof Product) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === "asc" ? "desc" : "asc")
    } else {
      setSortColumn(column)
      setSortDirection("asc")
    }
  }

  const sortedProducts = [...products].sort((a, b) => {
    if (!sortColumn) return 0
    
    const aVal = sortColumn === "latest_offer" ? a.latest_offer?.price : a[sortColumn]
    const bVal = sortColumn === "latest_offer" ? b.latest_offer?.price : b[sortColumn]
    
    if (aVal === undefined || aVal === null) return 1
    if (bVal === undefined || bVal === null) return -1
    
    const comparison = String(aVal).localeCompare(String(bVal))
    return sortDirection === "asc" ? comparison : -comparison
  })

  return (
    <div className="rounded-md border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-muted/50">
            <tr>
              <th className="p-2 text-left text-sm font-medium">Image</th>
              <th 
                className="p-2 text-left text-sm font-medium cursor-pointer hover:bg-muted/80"
                onClick={() => handleSort("title")}
              >
                Title {sortColumn === "title" && (sortDirection === "asc" ? "↑" : "↓")}
              </th>
              <th 
                className="p-2 text-left text-sm font-medium cursor-pointer hover:bg-muted/80"
                onClick={() => handleSort("asin")}
              >
                ASIN {sortColumn === "asin" && (sortDirection === "asc" ? "↑" : "↓")}
              </th>
              <th 
                className="p-2 text-left text-sm font-medium cursor-pointer hover:bg-muted/80"
                onClick={() => handleSort("latest_offer")}
              >
                Price {sortColumn === "latest_offer" && (sortDirection === "asc" ? "↑" : "↓")}
              </th>
              <th className="p-2 text-left text-sm font-medium">Availability</th>
              <th className="p-2 text-left text-sm font-medium">Updated</th>
            </tr>
          </thead>
          <tbody>
            {sortedProducts.map((product, index) => (
              <motion.tr
                key={product.asin}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2, delay: index * 0.02 }}
                className="border-b hover:bg-muted/50 cursor-pointer"
              >
                <td className="p-2">
                  <Link href={`/products/${product.asin}`}>
                    {product.image_url ? (
                      <Image
                        src={product.image_url}
                        alt={product.title}
                        width={48}
                        height={48}
                        className="rounded object-cover"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded bg-muted flex items-center justify-center text-xs">
                        No image
                      </div>
                    )}
                  </Link>
                </td>
                <td className="p-2">
                  <Link href={`/products/${product.asin}`} className="hover:underline">
                    <div className="font-medium">{product.title}</div>
                    {product.brand && (
                      <div className="text-xs text-muted-foreground">{product.brand}</div>
                    )}
                  </Link>
                </td>
                <td className="p-2">
                  <Link href={`/products/${product.asin}`} className="font-mono text-xs hover:underline">
                    {product.asin}
                  </Link>
                </td>
                <td className="p-2">
                  {product.latest_offer?.price !== undefined && product.latest_offer.price !== null ? (
                    <span className="font-semibold">
                      {formatMoney(product.latest_offer.price, product.latest_offer.currency)}
                    </span>
                  ) : (
                    <span className="text-muted-foreground">N/A</span>
                  )}
                </td>
                <td className="p-2">
                  {product.latest_offer?.availability && (
                    <Badge variant={getAvailabilityBadgeVariant(product.latest_offer.availability)}>
                      {product.latest_offer.availability}
                    </Badge>
                  )}
                </td>
                <td className="p-2 text-xs text-muted-foreground">
                  {product.latest_offer?.fetched_at && formatTimeAgo(product.latest_offer.fetched_at)}
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

