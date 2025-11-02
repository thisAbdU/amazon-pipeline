// For server-side rendering, prioritize API_BASE (Docker service name)
// For client-side, use NEXT_PUBLIC_API_BASE
// In Next.js App Router, server components run in Node.js and can use API_BASE
// Client components run in the browser and must use NEXT_PUBLIC_API_BASE
function getApiBase(): string {
  // Check if we're in a server context (has API_BASE) vs client context
  if (typeof window === 'undefined') {
    // Server-side: use API_BASE (Docker service name) or fallback
    const apiBase = process.env.API_BASE || 'http://api:8000'
    console.log('[getApiBase] Server context - API_BASE:', apiBase, 'from env:', process.env.API_BASE)
    return apiBase
  } else {
    // Client-side: use NEXT_PUBLIC_API_BASE (host-accessible URL)
    const apiBase = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000'
    console.log('[getApiBase] Client context - NEXT_PUBLIC_API_BASE:', apiBase)
    return apiBase
  }
}

export interface FetchOptions {
  next?: {
    revalidate?: number
  }
  signal?: AbortSignal
}

export async function getJSON<T>(path: string, options: FetchOptions = {}): Promise<T> {
  // Re-evaluate API_BASE at runtime to ensure we get the latest env vars
  const apiBase = getApiBase()
  const url = path.startsWith('http') ? path : `${apiBase}${path}`
  
  // Debug logging (remove in production)
  if (process.env.NODE_ENV === 'development') {
    console.log('[fetcher] Using API_BASE:', apiBase, 'for path:', path)
  }
  
  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
    },
  })

  if (!response.ok) {
    const error = await response.text().catch(() => 'Unknown error')
    throw new Error(`HTTP ${response.status}: ${error}`)
  }

  return response.json()
}

export async function getProducts(params?: {
  search?: string
  brand?: string
  category?: string
  min_price?: number
  max_price?: number
  in_stock?: boolean
  limit?: number
  offset?: number
}) {
  const searchParams = new URLSearchParams()
  
  if (params?.search) searchParams.set('q', params.search)
  if (params?.brand) searchParams.set('brand', params.brand)
  if (params?.category) searchParams.set('category', params.category)
  if (params?.min_price !== undefined) searchParams.set('min_price', params.min_price.toString())
  if (params?.max_price !== undefined) searchParams.set('max_price', params.max_price.toString())
  if (params?.in_stock !== undefined) searchParams.set('in_stock', params.in_stock.toString())
  if (params?.limit !== undefined) searchParams.set('limit', params.limit.toString())
  if (params?.offset !== undefined) searchParams.set('offset', params.offset.toString())

  const query = searchParams.toString()
  return getJSON<{
    products: Array<{
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
    }>
    limit: number
    offset: number
  }>(`/products?${query}`, { next: { revalidate: 0 } })
}

export async function getProduct(asin: string) {
  return getJSON<{
    asin: string
    title: string
    brand?: string
    category?: string
    image_url?: string
    created_at: string
    updated_at: string
    latest_offer?: {
      price: number
      currency: string
      availability: string
      seller: string
      fetched_at: string
    }
    sparkline: Array<{
      price: number
      currency: string
      availability: string
      change_type?: string
      fetched_at: string
    }>
  }>(`/products/${asin}`, { next: { revalidate: 0 } })
}

