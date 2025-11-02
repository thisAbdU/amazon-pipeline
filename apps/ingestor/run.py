import os
import asyncio
from pathlib import Path
from typing import Optional
import typer
from sqlalchemy.ext.asyncio import create_async_engine, AsyncSession, async_sessionmaker
from sqlalchemy import text
from dotenv import load_dotenv

load_dotenv()

# Import provider based on environment variable
PROVIDER = os.getenv("PROVIDER", "mock").lower()  # mock, scraper, or scrapingbee

if PROVIDER == "scrapingbee":
    from provider_scrapingbee import fetch_products
    print("🤖 Using ScrapingBee AI provider")
elif PROVIDER == "scraper":
    from provider_scraper import fetch_products
    print("🌐 Using Playwright scraper provider")
else:
    from provider_mock import fetch_products
    print("📦 Using mock provider (set PROVIDER=scrapingbee or PROVIDER=scraper to enable scraping)")

app = typer.Typer()

# Handle empty string from docker-compose (when .env doesn't exist)
DATABASE_URL = os.getenv("DATABASE_URL") or "postgresql+asyncpg://postgres:postgres@postgres:5432/amazon"

engine = None
AsyncSessionLocal = None


def get_session() -> AsyncSession:
    global AsyncSessionLocal
    return AsyncSessionLocal()


async def init_db():
    """Initialize database connection."""
    global engine, AsyncSessionLocal
    engine = create_async_engine(DATABASE_URL, echo=False)
    AsyncSessionLocal = async_sessionmaker(
        engine,
        class_=AsyncSession,
        expire_on_commit=False,
        autocommit=False,
        autoflush=False,
    )


async def close_db():
    """Close database connection."""
    global engine
    if engine:
        await engine.dispose()


async def upsert_product(product, session: AsyncSession):
    """Upsert a product into the products table."""
    query = text("""
        INSERT INTO products (asin, title, brand, category, image_url, updated_at)
        VALUES (:asin, :title, :brand, :category, :image_url, NOW())
        ON CONFLICT (asin) DO UPDATE SET
            title = EXCLUDED.title,
            brand = EXCLUDED.brand,
            category = EXCLUDED.category,
            image_url = EXCLUDED.image_url,
            updated_at = NOW()
    """)

    await session.execute(query, {
        "asin": product.asin,
        "title": product.title,
        "brand": product.brand,
        "category": product.category,
        "image_url": product.image_url,
    })


async def insert_offer(product, session: AsyncSession):
    """Insert a new offer and handle change detection for offer_history."""
    # Insert new offer
    insert_offer_query = text("""
        INSERT INTO offers (product_id, price, currency, availability, seller, fetched_at)
        VALUES (:product_id, :price, :currency, :availability, :seller, NOW())
        RETURNING id, fetched_at
    """)

    result = await session.execute(insert_offer_query, {
        "product_id": product.asin,
        "price": product.price,
        "currency": product.currency,
        "availability": product.availability,
        "seller": product.seller,
    })
    new_offer = result.fetchone()

    # Get previous offer (second most recent)
    prev_offer_query = text("""
        SELECT price, currency, availability, seller, fetched_at
        FROM offers
        WHERE product_id = :product_id
          AND id != :current_id
        ORDER BY fetched_at DESC
        LIMIT 1
    """)

    prev_result = await session.execute(prev_offer_query, {
        "product_id": product.asin,
        "current_id": new_offer.id,
    })
    prev_offer = prev_result.fetchone()

    # Determine change type and insert into history if there's a change
    if prev_offer:
        change_type = None

        if prev_offer.price != product.price:
            change_type = "price_change"
        elif prev_offer.availability != product.availability:
            change_type = "availability_change"
        elif (prev_offer.seller != product.seller or
              prev_offer.currency != product.currency):
            change_type = "other"

        if change_type:
            insert_history_query = text("""
                INSERT INTO offer_history (
                    product_id, price, currency, availability, seller, change_type, fetched_at
                )
                VALUES (:product_id, :price, :currency, :availability, :seller, :change_type, NOW())
            """)

            await session.execute(insert_history_query, {
                "product_id": product.asin,
                "price": product.price,
                "currency": product.currency,
                "availability": product.availability,
                "seller": product.seller,
                "change_type": change_type,
            })
    else:
        # First offer for this product - record it with change_type 'initial'
        insert_history_query = text("""
            INSERT INTO offer_history (
                product_id, price, currency, availability, seller, change_type, fetched_at
            )
            VALUES (:product_id, :price, :currency, :availability, :seller, 'initial', NOW())
        """)

        await session.execute(insert_history_query, {
            "product_id": product.asin,
            "price": product.price,
            "currency": product.currency,
            "availability": product.availability,
            "seller": product.seller,
        })


async def get_existing_asins(session: AsyncSession, asins: list) -> set:
    """Get set of ASINs that already exist in the database."""
    if not asins:
        return set()
    
    query = text("SELECT asin FROM products WHERE asin = ANY(:asins)")
    result = await session.execute(query, {"asins": asins})
    existing = {row[0] for row in result.fetchall()}
    return existing


async def ingest_once(target_asins: Optional[list] = None):
    """Run a single ingestion cycle."""
    await init_db()
    session = get_session()

    try:
        # Filter out existing ASINs before scraping (only if specific ASINs provided)
        asins_to_scrape = target_asins
        if target_asins and len(target_asins) > 0:
            existing_asins = await get_existing_asins(session, target_asins)
            asins_to_scrape = [asin for asin in target_asins if asin not in existing_asins]
            
            if existing_asins:
                print(f"⏭️  Skipping {len(existing_asins)} existing products: {', '.join(sorted(existing_asins))}")
            
            if not asins_to_scrape:
                print("✅ All products already exist in database. Nothing to scrape.")
                return
            
            print(f"📥 Scraping {len(asins_to_scrape)} new products: {', '.join(asins_to_scrape)}")
        
        # Fetch products from provider (only for new ASINs if ASINs were provided)
        search_query = os.getenv("SEARCH_QUERY", "").strip()
        
        if PROVIDER == "scraper":
            # Playwright scraper is async
            products = await fetch_products(asins_to_scrape)
        elif PROVIDER == "scrapingbee":
            # ScrapingBee is synchronous
            # If search_query exists, use it; otherwise use filtered ASINs
            products = fetch_products(asins_to_scrape if asins_to_scrape else None, search_query if search_query else None)
        else:
            # Mock provider is synchronous
            products = fetch_products(asins_to_scrape)

        if not products:
            print("No products to ingest")
            return

        # Filter out products that already exist (double-check after scraping)
        existing_after_scrape = await get_existing_asins(session, [p.asin for p in products])
        new_products = [p for p in products if p.asin not in existing_after_scrape]
        
        if existing_after_scrape and len(new_products) < len(products):
            skipped = len(products) - len(new_products)
            print(f"⏭️  Skipping {skipped} products that were added during scraping")

        if not new_products:
            print("✅ All scraped products already exist. Nothing to store.")
            return

        print(f"Ingesting {len(new_products)} new products...")

        for product in new_products:
            # Upsert product
            await upsert_product(product, session)

            # Insert offer
            await insert_offer(product, session)

            print(f"  ✓ Ingested {product.asin}: {product.title[:50]}...")

        await session.commit()
        print(f"✅ Successfully ingested {len(new_products)} new products")

    except Exception as e:
        await session.rollback()
        print(f"Error during ingestion: {e}")
        raise
    finally:
        await session.close()
        await close_db()


@app.command()
def run_once(
    once: bool = typer.Option(True, "--once", help="Run ingestion once and exit"),
):
    """Run the ingestor once."""
    target_asins_env = os.getenv("TARGET_ASINS", "").strip()
    target_asins = None

    if target_asins_env:
        target_asins = [asin.strip() for asin in target_asins_env.split(",") if asin.strip()]
    else:
        # Read from samples/asins.txt
        samples_dir = Path(__file__).parent / "samples"
        asins_file = samples_dir / "asins.txt"
        if asins_file.exists():
            with open(asins_file, "r") as f:
                target_asins = [line.strip() for line in f if line.strip()]

    asyncio.run(ingest_once(target_asins))


if __name__ == "__main__":
    app()

