import os
import re
import json
from typing import List, Optional
from scrapingbee import ScrapingBeeClient
from pydantic import BaseModel


class ProductIngest(BaseModel):
    asin: str
    title: str
    brand: Optional[str] = None
    category: Optional[str] = None
    image_url: Optional[str] = None
    price: Optional[float] = None
    currency: str = "USD"
    availability: Optional[str] = None
    seller: Optional[str] = None


def extract_asin_from_url(url: str) -> Optional[str]:
    """Extract ASIN from Amazon URL."""
    # Patterns: /dp/ASIN, /gp/product/ASIN, /product/ASIN
    patterns = [
        r'/dp/([A-Z0-9]{10})',
        r'/gp/product/([A-Z0-9]{10})',
        r'/product/([A-Z0-9]{10})',
        r'/([A-Z0-9]{10})(?:/|$)'
    ]
    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1)
    return None


def scrape_product_by_asin(client: ScrapingBeeClient, asin: str) -> Optional[ProductIngest]:
    """Scrape a single product page by ASIN using ScrapingBee."""
    url = f"https://www.amazon.com/dp/{asin}"
    
    ai_extract_rules = {
        "title": {
            "type": "string",
            "description": "The full product title as displayed on the page",
        },
        "price": {
            "type": "string",
            "description": "The current price of the product in USD format (e.g., '$29.99' or '29.99')",
        },
        "brand": {
            "type": "string",
            "description": "The brand or manufacturer name of the product",
        },
        "category": {
            "type": "string",
            "description": "The product category from breadcrumbs (e.g., 'Electronics', 'Video Games')",
        },
        "availability": {
            "type": "string",
            "description": "The availability status (e.g., 'In Stock', 'Out of Stock', 'Available')",
        },
        "seller": {
            "type": "string",
            "description": "The seller information (usually 'Amazon.com' or merchant name)",
        },
        "image_url": {
            "type": "string",
            "description": "The main product image URL",
        },
    }
    
    # ScrapingBee Python client: pass dict for ai_extract_rules (client handles stringification)
    # For boolean params, use strings "true"/"false" or actual booleans
    ai_params = {
        "ai_query": "Extract product details including title, price, brand, category, availability, seller, and main product image URL",
        "ai_extract_rules": ai_extract_rules,  # Pass as dict - client will stringify
        "render_js": True,  # Required for Amazon's dynamic content
        "premium_proxy": True,  # Helpful for Amazon (may require premium plan)
        "wait": 2000,  # Wait 2 seconds for JS to render
        "block_resources": False,  # Keep images/CSS for better extraction
    }
    
    try:
        response = client.get(url, params=ai_params)
        
        if response.status_code != 200:
            error_msg = f"HTTP {response.status_code}"
            try:
                error_body = response.text[:200] if hasattr(response, 'text') else str(response.content)[:200]
                if response.status_code == 401:
                    error_msg += " (Unauthorized - Check your API key)"
                elif response.status_code == 403:
                    error_msg += " (Forbidden - Check API quota/limits)"
                error_msg += f": {error_body}"
            except:
                pass
            print(f"  ✗ Failed to scrape {asin}: {error_msg}")
            return None
        
        results = response.json()
        
        # Extract price and convert to float
        price = None
        price_str = results.get("price", "")
        if price_str:
            # Remove currency symbols and extract number
            price_clean = re.sub(r'[^\d.]', '', str(price_str))
            try:
                price = float(price_clean)
            except (ValueError, TypeError):
                pass
        
        # Extract title
        title = results.get("title", "").strip()
        if not title or len(title) < 5:
            print(f"  ⚠ No title found for {asin}")
            return None
        
        # Extract other fields
        brand = results.get("brand", "").strip() or None
        category = results.get("category", "").strip() or None
        availability = results.get("availability", "Check availability").strip() or "Check availability"
        seller = results.get("seller", "Amazon.com").strip() or "Amazon.com"
        image_url = results.get("image_url", "").strip() or None
        
        return ProductIngest(
            asin=asin,
            title=title,
            brand=brand,
            category=category,
            image_url=image_url,
            price=price,
            currency="USD",
            availability=availability,
            seller=seller
        )
    
    except Exception as e:
        print(f"  ✗ Error scraping {asin}: {str(e)}")
        return None


def scrape_search_results(client: ScrapingBeeClient, search_query: str, max_results: int = 15) -> List[ProductIngest]:
    """Scrape Amazon search results using ScrapingBee."""
    url = f"https://www.amazon.com/s?k={search_query.replace(' ', '+')}"
    
    ai_extract_rules = {
        "product_name": {
            "type": "list",
            "description": "The full product name/title as displayed on the search results page",
        },
        "product_price": {
            "type": "list",
            "description": "The price of each product in USD format",
        },
        "product_link": {
            "type": "list",
            "description": "The URL or path to the product page (can be relative or absolute)",
        },
        "product_brand": {
            "type": "list",
            "description": "The brand name for each product if available",
        },
        "product_category": {
            "type": "list",
            "description": "The category for each product if visible",
        },
        "product_availability": {
            "type": "list",
            "description": "The availability status for each product",
        },
        "product_image": {
            "type": "list",
            "description": "The product image URL for each item",
        },
    }
    
    # ScrapingBee Python client: pass dict for ai_extract_rules (client handles stringification)
    ai_params = {
        "ai_query": f"Extract the first {max_results} products with their names, prices, ASINs, brands, categories, availability, sellers, and product image URLs",
        "ai_extract_rules": ai_extract_rules,  # Pass as dict - client will stringify
        "render_js": True,  # Required for Amazon's dynamic content
        "premium_proxy": True,  # Helpful for Amazon (may require premium plan)
        "wait": 2000,  # Wait 2 seconds for JS to render
        "block_resources": False,  # Keep images/CSS for better extraction
    }
    
    try:
        response = client.get(url, params=ai_params)
        
        if response.status_code != 200:
            print(f"✗ Failed to scrape search results: HTTP {response.status_code}")
            return []
        
        results = response.json()
        products = []
        
        names = results.get("product_name", [])
        prices = results.get("product_price", [])
        links = results.get("product_link", [])
        brands = results.get("product_brand", [])
        categories = results.get("product_category", [])
        availabilities = results.get("product_availability", [])
        images = results.get("product_image", [])
        
        # Combine all data
        for i in range(min(len(names), max_results)):
            if i >= len(links):
                continue
            
            # Extract ASIN from link
            link = links[i] if i < len(links) else ""
            asin = extract_asin_from_url(link)
            if not asin:
                # Skip if we can't find ASIN
                continue
            
            # Extract price
            price = None
            if i < len(prices):
                price_str = prices[i]
                price_clean = re.sub(r'[^\d.]', '', str(price_str))
                try:
                    price = float(price_clean)
                except (ValueError, TypeError):
                    pass
            
            products.append(ProductIngest(
                asin=asin,
                title=names[i] if i < len(names) else f"Product {i+1}",
                brand=brands[i] if i < len(brands) and brands[i] else None,
                category=categories[i] if i < len(categories) and categories[i] else None,
                image_url=images[i] if i < len(images) and images[i] else None,
                price=price,
                currency="USD",
                availability=availabilities[i] if i < len(availabilities) and availabilities[i] else "Check availability",
                seller="Amazon.com"
            ))
        
        return products
    
    except Exception as e:
        print(f"✗ Error scraping search results: {str(e)}")
        return []


def fetch_products(asins: Optional[List[str]] = None, search_query: Optional[str] = None) -> List[ProductIngest]:
    """
    Fetch products using ScrapingBee API.
    
    Args:
        asins: List of ASINs to scrape individually
        search_query: Search query to scrape search results (optional)
    
    Returns:
        List of ProductIngest objects
    """
    api_key = os.getenv("SCRAPINGBEE_API_KEY")
    if not api_key:
        print("⚠ SCRAPINGBEE_API_KEY not found in environment variables")
        return []
    
    client = ScrapingBeeClient(api_key=api_key)
    
    products = []
    
    # If search query is provided, scrape search results
    if search_query:
        print(f"🔍 Scraping Amazon search: '{search_query}'")
        search_products = scrape_search_results(client, search_query, max_results=15)
        products.extend(search_products)
        print(f"  ✓ Found {len(search_products)} products from search")
    
    # Scrape individual products by ASIN
    if asins:
        print(f"📦 Scraping {len(asins)} products by ASIN...")
        for i, asin in enumerate(asins, 1):
            print(f"  [{i}/{len(asins)}] Scraping {asin}...")
            product = scrape_product_by_asin(client, asin)
            if product:
                products.append(product)
                print(f"    ✓ Found: {product.title[:60]}...")
            else:
                print(f"    ✗ Failed to scrape {asin}")
    
    return products

