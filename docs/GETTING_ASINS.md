# How to Get Amazon ASINs

## What is an ASIN?

ASIN (Amazon Standard Identification Number) is a 10-character alphanumeric unique identifier for products on Amazon.

## Quick Methods

### Method 1: From Product URL (Easiest)

1. Go to any Amazon product page
2. Look at the URL:
   ```
   https://www.amazon.com/dp/B07XJ8C8F5
                              ^^^^^^^^^^
                              This is the ASIN!
   ```
3. Copy the 10-character code after `/dp/`

### Method 2: From Product Page

1. Scroll to "Product details" section
2. Look for "ASIN: B07XJ8C8F5"
3. Copy it

### Method 3: Use the Helper Script

We've created a script that automatically extracts ASINs from Amazon search results!

```bash
# Search for products and get their ASINs
docker compose -f infra/docker-compose.yml run --rm scheduler \
  python extract_asins.py "wireless earbuds"

# Save ASINs directly to file
docker compose -f infra/docker-compose.yml run --rm scheduler \
  python extract_asins.py "laptop stand" --save
```

### Method 4: From Search Results

1. Search for products on Amazon
2. Open each product in a new tab
3. Extract ASINs from URLs (Method 1)

### Method 5: Amazon Best Sellers

1. Go to https://www.amazon.com/gp/bestsellers
2. Browse categories
3. Extract ASINs from product URLs

### Method 6: Category Pages

1. Browse Amazon categories
2. Click on products
3. Extract ASINs from URLs

## Bulk Collection Tips

### Using Browser Extensions
- Install a browser extension that extracts ASINs from search results
- Some extensions can bulk-export ASINs

### Using Developer Tools
1. Open Amazon search results
2. Press F12 (Developer Tools)
3. Search for "data-asin" in the HTML
4. Find patterns like: `data-asin="B07XJ8C8F5"`

### Manual Collection
Create a list of ASINs from:
- Your wishlist
- Recent purchases
- Products you're tracking
- Competitor products

## Adding ASINs to Your Pipeline

### Option 1: Edit the File Directly

```bash
# Edit the ASINs file
nano apps/ingestor/samples/asins.txt

# Add one ASIN per line:
B07XJ8C8F5
B09JQMJSXY
B08N5WRWNW
```

### Option 2: Use Environment Variable

```bash
# In .env file
TARGET_ASINS=B07XJ8C8F5,B09JQMJSXY,B08N5WRWNW,B08N5WRWNW
```

### Option 3: Use the Helper Script

```bash
# Extract and save ASINs from search
docker compose -f infra/docker-compose.yml run --rm scheduler \
  python extract_asins.py "your search query" --save
```

## Finding Valid ASINs

### What Makes an ASIN Valid?
- 10 characters (letters and numbers)
- Starts with letter (usually B)
- Product exists on Amazon.com
- Product is still available (or was available)

### Testing ASINs
You can test if an ASIN is valid by:
1. Going to: `https://www.amazon.com/dp/YOUR_ASIN`
2. If the page loads, it's valid
3. If you get 404, the product may be discontinued

## Common ASIN Sources

1. **Product Research Tools**
   - Jungle Scout
   - Helium 10
   - Keepa

2. **Amazon Reports**
   - Sales reports (if you're a seller)
   - Advertising reports

3. **Public Lists**
   - Amazon Best Sellers lists
   - Product comparison sites
   - Review sites

## Tips

- ✅ Use real, current ASINs for best results
- ✅ Focus on products in categories you care about
- ✅ Mix popular and niche products
- ✅ Update your list regularly (products get discontinued)
- ❌ Don't use random character combinations
- ❌ Avoid very old/discontinued products

## Example Workflow

1. **Research Phase**
   ```bash
   # Find ASINs for "wireless mouse"
   docker compose -f infra/docker-compose.yml run --rm scheduler \
     python extract_asins.py "wireless mouse" --save
   ```

2. **Review**
   ```bash
   # Check what was added
   cat apps/ingestor/samples/asins.txt
   ```

3. **Start Scraping**
   ```bash
   # The scheduler will automatically use these ASINs
   docker compose -f infra/docker-compose.yml up scheduler
   ```

