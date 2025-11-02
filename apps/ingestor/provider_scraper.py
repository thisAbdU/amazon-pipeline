import re
import asyncio
import time
from typing import List, Optional
from playwright.async_api import async_playwright, Browser, Page
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


async def scrape_product_page(page: Page, asin: str) -> Optional[ProductIngest]:
    """Scrape a single product page by ASIN."""
    url = f"https://www.amazon.com/dp/{asin}"
    
    try:
        await page.goto(url, wait_until="networkidle", timeout=30000)
        await asyncio.sleep(2)  # Wait for dynamic content
        
        # Extract title
        title_selectors = [
            '#productTitle',
            'h1.a-size-large',
            'span#productTitle',
            'h1[data-automation-id="title"]'
        ]
        title = None
        for selector in title_selectors:
            try:
                title_elem = await page.wait_for_selector(selector, timeout=5000)
                if title_elem:
                    title = await title_elem.inner_text()
                    title = title.strip()
                    break
            except:
                continue
        
        if not title:
            # Fallback: try to get any h1
            h1_elem = await page.query_selector('h1')
            if h1_elem:
                title = await h1_elem.inner_text()
                title = title.strip()
        
        if not title or len(title) < 5:
            print(f"  ⚠ Could not extract title for {asin}")
            return None
        
        # Extract price
        price_selectors = [
            'span.a-price-whole',
            '.a-price .a-offscreen',
            '#priceblock_ourprice',
            '#priceblock_dealprice',
            'span.a-price-symbol + span',
            '[data-a-color="price"] .a-offscreen'
        ]
        price = None
        price_text = None
        for selector in price_selectors:
            try:
                price_elem = await page.query_selector(selector)
                if price_elem:
                    price_text = await price_elem.inner_text()
                    # Remove currency symbols and extract number
                    price_text = re.sub(r'[^\d.]', '', price_text)
                    if price_text:
                        price = float(price_text)
                        break
            except:
                continue
        
        # Try to extract price from aria-label or data attributes
        if not price:
            price_elem = await page.query_selector('[data-a-color="price"]')
            if price_elem:
                price_attr = await price_elem.get_attribute('data-a-color')
                price_text = await price_elem.inner_text()
                price_text = re.sub(r'[^\d.]', '', price_text)
                if price_text:
                    try:
                        price = float(price_text)
                    except:
                        pass
        
        # Extract availability
        availability = None
        availability_selectors = [
            '#availability span',
            '#availability-feature_feature_div span',
            '.a-section.a-spacing-none.aok-align-center span',
            '[data-asin] + div span'
        ]
        for selector in availability_selectors:
            try:
                avail_elem = await page.query_selector(selector)
                if avail_elem:
                    avail_text = await avail_elem.inner_text()
                    if any(word in avail_text.lower() for word in ['stock', 'available', 'ships']):
                        availability = avail_text.strip()
                        break
            except:
                continue
        
        if not availability:
            availability = "Check availability"
        
        # Extract brand
        brand = None
        brand_selectors = [
            '#brand',
            'a#brand',
            'tr.po-brand td span',
            '[data-feature-name="bylineInfo"] a'
        ]
        for selector in brand_selectors:
            try:
                brand_elem = await page.query_selector(selector)
                if brand_elem:
                    brand = await brand_elem.inner_text()
                    brand = brand.strip()
                    # Remove "Visit the" prefix if present
                    brand = re.sub(r'^Visit the\s+', '', brand, flags=re.IGNORECASE)
                    break
            except:
                continue
        
        # Extract image URL
        image_url = None
        image_selectors = [
            '#landingImage',
            '#imgBlkFront',
            '#main-image',
            'img[data-a-dynamic-image]'
        ]
        for selector in image_selectors:
            try:
                img_elem = await page.query_selector(selector)
                if img_elem:
                    image_url = await img_elem.get_attribute('src')
                    if not image_url:
                        image_url = await img_elem.get_attribute('data-src')
                    if image_url:
                        break
            except:
                continue
        
        # Extract category (breadcrumb)
        category = None
        try:
            breadcrumb = await page.query_selector('#wayfinding-breadcrumbs_feature_div')
            if breadcrumb:
                category_links = await breadcrumb.query_selector_all('a')
                if category_links:
                    # Usually the last breadcrumb is the category
                    category_text = await category_links[-1].inner_text()
                    category = category_text.strip()
        except:
            pass
        
        # Extract seller (if available)
        seller = None
        try:
            seller_elem = await page.query_selector('#sellerProfileTriggerId, #merchant-info a')
            if seller_elem:
                seller = await seller_elem.inner_text()
                seller = seller.strip()
            else:
                # Check for "Ships from" or "Sold by"
                seller_text = await page.inner_text('body')
                if 'Sold by' in seller_text or 'Ships from' in seller_text:
                    seller = "Amazon.com"
        except:
            seller = "Amazon.com"
        
        return ProductIngest(
            asin=asin,
            title=title,
            brand=brand,
            category=category,
            image_url=image_url,
            price=price,
            currency="USD",
            availability=availability,
            seller=seller or "Amazon.com"
        )
    
    except Exception as e:
        print(f"  ✗ Error scraping {asin}: {str(e)}")
        return None


async def fetch_products(asins: Optional[List[str]] = None) -> List[ProductIngest]:
    """
    Scrape products from Amazon by ASIN.
    Requires ASINs to be provided.
    """
    if not asins:
        print("⚠ No ASINs provided for scraping")
        return []
    
    products = []
    
    async with async_playwright() as p:
        # Launch browser with stealth settings
        browser = await p.chromium.launch(
            headless=True,
            args=[
                '--disable-blink-features=AutomationControlled',
                '--disable-dev-shm-usage',
                '--no-sandbox'
            ]
        )
        
        # Create context with realistic user agent
        context = await browser.new_context(
            user_agent='Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
            viewport={'width': 1920, 'height': 1080},
            locale='en-US',
            timezone_id='America/New_York'
        )
        
        page = await context.new_page()
        
        # Set extra headers to appear more like a real browser
        await page.set_extra_http_headers({
            'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
            'Accept-Language': 'en-US,en;q=0.9',
            'Accept-Encoding': 'gzip, deflate, br',
            'DNT': '1',
            'Connection': 'keep-alive',
            'Upgrade-Insecure-Requests': '1',
        })
        
        try:
            for i, asin in enumerate(asins, 1):
                print(f"  [{i}/{len(asins)}] Scraping {asin}...")
                product = await scrape_product_page(page, asin)
                
                if product:
                    products.append(product)
                    print(f"    ✓ Found: {product.title[:60]}...")
                else:
                    print(f"    ✗ Failed to scrape {asin}")
                
                # Rate limiting: wait between requests
                if i < len(asins):
                    delay = 3 + (i % 3)  # 3-5 seconds between requests
                    await asyncio.sleep(delay)
            
        finally:
            await browser.close()
    
    return products

