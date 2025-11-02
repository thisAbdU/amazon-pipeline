"use client"

import { useState, useEffect, useCallback } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { useDebounce } from "@/hooks/use-debounce"

interface FiltersProps {
  brands?: string[]
  categories?: string[]
}

export function Filters({ brands = [], categories = [] }: FiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  
  const [search, setSearch] = useState(searchParams.get("q") || "")
  const brandParam = searchParams.get("brand")
  const categoryParam = searchParams.get("category")
  const [brand, setBrand] = useState(brandParam && brandParam !== "" ? brandParam : undefined)
  const [category, setCategory] = useState(categoryParam && categoryParam !== "" ? categoryParam : undefined)
  const [minPrice, setMinPrice] = useState(searchParams.get("min_price") || "")
  const [maxPrice, setMaxPrice] = useState(searchParams.get("max_price") || "")
  const [inStock, setInStock] = useState(searchParams.get("in_stock") === "true")

  const debouncedSearch = useDebounce(search, 500)

  const updateURL = useCallback(() => {
    const params = new URLSearchParams()
    if (debouncedSearch) params.set("q", debouncedSearch)
    if (brand) params.set("brand", brand)
    if (category) params.set("category", category)
    if (minPrice) params.set("min_price", minPrice)
    if (maxPrice) params.set("max_price", maxPrice)
    if (inStock) params.set("in_stock", "true")
    
    router.push(`/products?${params.toString()}`)
  }, [debouncedSearch, brand, category, minPrice, maxPrice, inStock, router])

  useEffect(() => {
    updateURL()
  }, [debouncedSearch, brand, category, minPrice, maxPrice, inStock, updateURL])

  const handleReset = () => {
    setSearch("")
    setBrand(undefined)
    setCategory(undefined)
    setMinPrice("")
    setMaxPrice("")
    setInStock(false)
    router.push("/products")
  }

  return (
    <div className="space-y-4 p-4 border rounded-lg bg-card">
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="space-y-2">
          <Label htmlFor="search">Search</Label>
          <Input
            id="search"
            type="search"
            placeholder="Product name..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="brand">Brand</Label>
          <Select 
            {...(brand ? { value: brand } : {})}
            onValueChange={(value) => setBrand(value)}
          >
            <SelectTrigger id="brand">
              <SelectValue placeholder="All brands" />
            </SelectTrigger>
            <SelectContent>
              {brands.filter(Boolean).map((b) => (
                <SelectItem key={b} value={b}>{b}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="category">Category</Label>
          <Select 
            {...(category ? { value: category } : {})}
            onValueChange={(value) => setCategory(value)}
          >
            <SelectTrigger id="category">
              <SelectValue placeholder="All categories" />
            </SelectTrigger>
            <SelectContent>
              {categories.filter(Boolean).map((c) => (
                <SelectItem key={c} value={c}>{c}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-2">
          <Label htmlFor="inStock">In Stock</Label>
          <div className="flex items-center space-x-2">
            <input
              id="inStock"
              type="checkbox"
              checked={inStock}
              onChange={(e) => setInStock(e.target.checked)}
              className="rounded border-gray-300"
            />
            <Label htmlFor="inStock" className="cursor-pointer">
              Only show in stock
            </Label>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="minPrice">Min Price ($)</Label>
          <Input
            id="minPrice"
            type="number"
            placeholder="0.00"
            value={minPrice}
            onChange={(e) => setMinPrice(e.target.value)}
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="maxPrice">Max Price ($)</Label>
          <Input
            id="maxPrice"
            type="number"
            placeholder="9999.99"
            value={maxPrice}
            onChange={(e) => setMaxPrice(e.target.value)}
          />
        </div>
      </div>

      <div>
        <Button variant="outline" onClick={handleReset}>
          Reset Filters
        </Button>
      </div>
    </div>
  )
}

