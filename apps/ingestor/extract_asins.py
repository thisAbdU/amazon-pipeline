#!/usr/bin/env python3
"""
Helper script to extract ASINs from Amazon search results or product URLs.
This uses ScrapingBee to get ASINs from Amazon pages.
"""
import os
import re
import sys
from pathlib import Path
from dotenv import load_dotenv
from scrapingbee import ScrapingBeeClient

load_dotenv(Path(__file__).parent.parent.parent / '.env')


def extract_asin_from_url(url):
    """Extract ASIN from Amazon URL."""
    patterns = [
        r'/dp/([A-Z0-9]{10})',
        r'/gp/product/([A-Z0-9]{10})',
        r'/product/([A-Z0-9]{10})',
        r'/([A-Z0-9]{10})(?:[/?]|$)'
    ]
    for pattern in patterns:
        match = re.search(pattern, url)
        if match:
            return match.group(1)
    return None


def get_asins_from_search(search_query, max_results=20):
    """Get ASINs from Amazon search results."""
    api_key = os.getenv("SCRAPINGBEE_API_KEY")
    if not api_key:
        print("❌ SCRAPINGBEE_API_KEY not found")
        return []
    
    client = ScrapingBeeClient(api_key=api_key)
    url = f"https://www.amazon.com/s?k={search_query.replace(' ', '+')}"
    
    ai_extract_rules = {
        "product_link": {
            "type": "list",
            "description": "The URL or path to each product page",
        },
    }
    
    ai_params = {
        "ai_query": f"Extract the URLs/links to product pages from the first {max_results} search results",
        "ai_extract_rules": ai_extract_rules,
        "render_js": True,
        "wait": 2000,
    }
    
    try:
        print(f"🔍 Searching Amazon for: '{search_query}'")
        response = client.get(url, params=ai_params)
        
        if response.status_code != 200:
            print(f"❌ Failed: HTTP {response.status_code}")
            return []
        
        results = response.json()
        links = results.get("product_link", [])
        
        asins = []
        for link in links:
            asin = extract_asin_from_url(link)
            if asin and asin not in asins:
                asins.append(asin)
        
        print(f"✅ Found {len(asins)} unique ASINs")
        return asins
    
    except Exception as e:
        print(f"❌ Error: {e}")
        return []


def main():
    if len(sys.argv) < 2:
        print("Usage:")
        print("  python extract_asins.py 'search query'              # Get ASINs from search")
        print("  python extract_asins.py 'search query' --save       # Save to samples/asins.txt")
        print("  python extract_asins.py https://amazon.com/dp/B0... # Extract ASIN from URL")
        print()
        print("Examples:")
        print("  python extract_asins.py 'wireless earbuds'")
        print("  python extract_asins.py 'laptop stand' --save")
        print("  python extract_asins.py 'https://www.amazon.com/dp/B07XJ8C8F5'")
        sys.exit(1)
    
    arg = sys.argv[1]
    save = "--save" in sys.argv
    
    # If it's a URL, extract ASIN
    if arg.startswith("http"):
        asin = extract_asin_from_url(arg)
        if asin:
            print(f"✅ Found ASIN: {asin}")
            if save:
                asins_file = Path(__file__).parent / "samples" / "asins.txt"
                with open(asins_file, "a") as f:
                    if asin not in open(asins_file).read():
                        f.write(f"{asin}\n")
                        print(f"✅ Saved to {asins_file}")
        else:
            print("❌ Could not extract ASIN from URL")
    else:
        # Search query
        asins = get_asins_from_search(arg, max_results=20)
        
        if asins:
            print("\n📋 ASINs found:")
            for i, asin in enumerate(asins, 1):
                print(f"  {i}. {asin}")
            
            if save:
                asins_file = Path(__file__).parent / "samples" / "asins.txt"
                existing_asins = set()
                if asins_file.exists():
                    existing_asins = set(line.strip() for line in open(asins_file) if line.strip())
                
                with open(asins_file, "a") as f:
                    added = 0
                    for asin in asins:
                        if asin not in existing_asins:
                            f.write(f"{asin}\n")
                            added += 1
                    print(f"\n✅ Added {added} new ASINs to {asins_file}")
            else:
                print("\n💡 Tip: Add --save to append these to samples/asins.txt")


if __name__ == "__main__":
    main()

