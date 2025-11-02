# Amazon Pipeline

A complete end-to-end data pipeline monorepo that collects product data, processes it, stores it in PostgreSQL, and displays it on a web dashboard. All services run via Docker Compose.

## Architecture

The pipeline consists of the following services:

- **PostgreSQL 16**: Database for storing products, offers, and offer history
- **Adminer**: Web-based database administration tool
- **API (FastAPI)**: RESTful API service providing product data endpoints
- **Ingestor (Python)**: Service that periodically fetches and ingests product data from mock providers
- **Web (Next.js 14)**: Dashboard frontend for viewing products and their pricing history

## Quickstart

### Step 1: Clone and Setup

```bash
git clone <your-repo-url>
cd amazon-pipeline
```

### Step 2: Configure Environment

```bash
cp .env.example .env
```

**Note:** The default `.env` works out of the box with mock data (no API keys needed). The database will initialize with 8 sample products automatically!

### Step 3: Run Everything with One Command

```bash
docker compose -f infra/docker-compose.yml up --build
```

This single command will:
- ✅ Build all Docker images (PostgreSQL, API, Web Dashboard, Ingestor)
- ✅ Initialize the database with schema and **seed data** (8 sample products)
- ✅ Start all services:
  - **PostgreSQL** (database)
  - **Adminer** (database admin UI) on port 8080
  - **API** (FastAPI backend) on port 8000
  - **Web Dashboard** (Next.js frontend) on port 3000
  - **Ingestor** (data ingestion scheduler)

### Step 4: Access the Web Dashboard

Open your browser and go to:

**🌐 Web Dashboard: http://localhost:3000**

You should immediately see:
- Overview dashboard with KPIs (Total Products, In Stock %, Prices)
- Product list with 8 sample products
- Price history sparklines
- Beautiful, responsive UI with dark mode

### Step 5: Explore the Dashboard

1. **Home/Dashboard** (`/`): Overview with KPIs and charts
2. **Products** (`/products`): Browse and filter all products
3. **Product Detail** (`/products/[asin]`): View individual product with price history

### Additional Services (Optional)

- **Adminer (Database Admin)**: http://localhost:8080
  - Server: `postgres`
  - Username: `postgres`
  - Password: `postgres`
  - Database: `amazon`
  - Use this to inspect the database directly

- **API Documentation**: http://localhost:8000/docs
  - Interactive Swagger UI for testing API endpoints

- **API Health Check**: http://localhost:8000/health

## Project Structure

```
amazon-pipeline/
├── apps/
│   ├── api/              # FastAPI service
│   │   ├── routers/       # API endpoints
│   │   ├── db.py         # Database connection
│   │   ├── models.py     # SQLAlchemy models
│   │   └── main.py       # FastAPI app
│   ├── ingestor/         # Data ingestion service
│   │   ├── samples/       # Mock product data
│   │   ├── provider_mock.py
│   │   └── run.py        # Ingestor entry point
│   └── web/              # Next.js dashboard
│       └── app/          # Next.js App Router pages
├── db/
│   └── init.sql          # Database schema
├── infra/
│   └── docker-compose.yml # Docker Compose configuration
└── .env.example           # Environment variables template
```

## API Endpoints

- `GET /health` - Health check endpoint
- `GET /products` - List products with optional filters:
  - `q` - Search query (title)
  - `brand` - Filter by brand
  - `category` - Filter by category
  - `min_price` / `max_price` - Price range
  - `in_stock` - Filter by availability
  - `limit` / `offset` - Pagination
- `GET /products/{asin}` - Get product details with latest offer and 30-day price history

## Database Schema

### Tables

- **products**: Product metadata (ASIN, title, brand, category, etc.)
- **offers**: Current and historical product offers (price, availability, seller)
- **offer_history**: Tracked changes in offers (price changes, availability changes)

### Views

- **v_latest_offers**: Latest offer per product (using DISTINCT ON)

## Using Real Amazon Scraping (Optional)

By default, the pipeline uses **mock data** with 8 sample products already seeded in the database. You can start exploring the dashboard immediately without any setup!

To scrape **real Amazon products**, use ScrapingBee:

---

### ScrapingBee AI Provider ⭐

**ScrapingBee** is a managed scraping service that handles anti-scraping measures, CAPTCHAs, and IP blocking automatically.

**💰 Free Tier**: ScrapingBee offers **1,000 free API credits** per month for new users - perfect for testing and small projects!

#### Setup Steps:

1. **Sign up for ScrapingBee** (Free tier includes 1,000 credits/month):
   - Go to https://www.scrapingbee.com
   - Create an account (no credit card required for free tier)
   - Navigate to your **Dashboard**
   - Copy your **API Key**

2. **Update your `.env` file**:
   ```bash
   # Change provider from mock to scrapingbee
   PROVIDER=scrapingbee
   
   # Paste your API key from ScrapingBee dashboard
   SCRAPINGBEE_API_KEY=your_api_key_here
   ```

3. **Configure what to scrape** (choose one):

   **Option A: Scrape specific products by ASIN**
   ```bash
   # Add ASINs (comma-separated)
   TARGET_ASINS=B07XJ8C8F5,B09JQMJSXY,B08N5WRWNW
   ```
   
   **Option B: Scrape search results** (up to 15 products per search)
   ```bash
   # Search for products
   SEARCH_QUERY="wireless earbuds"
   ```

4. **Restart the ingestor**:
   ```bash
   docker compose -f infra/docker-compose.yml restart scheduler
   ```

   Or rebuild everything:
   ```bash
   docker compose -f infra/docker-compose.yml up --build
   ```

5. **Check the logs** to see scraping progress:
   ```bash
   docker compose -f infra/docker-compose.yml logs scheduler
   ```

#### Getting ASINs

- **From Amazon URL**: `https://www.amazon.com/dp/B07XJ8C8F5` → ASIN is `B07XJ8C8F5`
- **From product page**: Scroll to "Product details" section
- **Use helper script**: See `docs/GETTING_ASINS.md` for automated ASIN extraction

---

### Default: Mock Provider (No Setup Required)

If you don't set `PROVIDER` or set `PROVIDER=mock`, the system uses sample data. The database already comes with 8 sample products, so the dashboard works immediately!

## Extending the Pipeline

### Adding Custom Providers

You can create custom providers by implementing the same interface:

1. **Create a new provider module** (e.g., `provider_paapi.py`)
2. **Implement the interface**:
   ```python
   from typing import List, Optional
   from provider_mock import ProductIngest
   
   def fetch_products(asins: Optional[List[str]] = None) -> List[ProductIngest]:
       # Your implementation
       return products
   ```
3. **Update `run.py`** to import based on `USE_SCRAPER` or add a new env var

### Example: PA-API v5 Integration

```python
# apps/ingestor/provider_paapi.py
import boto3
from typing import List, Optional
from provider_mock import ProductIngest

def fetch_products(asins: Optional[List[str]] = None) -> List[ProductIngest]:
    paapi = boto3.client('product-advertising-api-v5', ...)
    # Fetch from PA-API
    # Return List[ProductIngest]
```

## Environment Variables

See `.env.example` for all available variables. Key ones:

**For Basic Usage (Mock Data - Default):**
- `PROVIDER=mock` - Uses sample data (no API keys needed)

**For Real Scraping (ScrapingBee - Free tier: 1,000 credits/month):**
- `PROVIDER=scrapingbee` - Enable ScrapingBee provider
- `SCRAPINGBEE_API_KEY` - Your API key from ScrapingBee dashboard (free tier available)
- `TARGET_ASINS` - Comma-separated ASINs to scrape (e.g., `B07XJ8C8F5,B09JQMJSXY`)
- `SEARCH_QUERY` - Alternative: search query to scrape (e.g., `"wireless earbuds"`)

**Other Settings:**
- `INGEST_INTERVAL_SECONDS` - How often ingestor runs (default: 1800 = 30 minutes)
- `NEXT_PUBLIC_API_BASE` - API URL for frontend (default: `http://localhost:8000`)
- `DATABASE_URL` - PostgreSQL connection (defaults work for Docker)

## Development

### Running Services Individually

You can run services outside Docker for development:

```bash
# API
cd apps/api
pip install -e .
uvicorn main:app --reload

# Ingestor (one-time run)
cd apps/ingestor
pip install -e .
python -m ingestor.run --once

# Web
cd apps/web
npm install
npm run dev
```

### Database Migrations

Currently using raw SQL in `db/init.sql`. For production, consider using Alembic:

```bash
cd apps/api
alembic init alembic
# Configure alembic.ini and create migrations
```

## Extending the Schema

To add new fields or tables:

1. Update `db/init.sql` with new schema
2. Update SQLAlchemy models in `apps/api/models.py`
3. Update Pydantic models in `apps/ingestor/provider_mock.py` if needed
4. Rebuild Docker containers or run migrations

## Troubleshooting

### Services Won't Start
```bash
# Check service status
docker compose -f infra/docker-compose.yml ps

# View logs for a specific service
docker compose -f infra/docker-compose.yml logs web
docker compose -f infra/docker-compose.yml logs api
docker compose -f infra/docker-compose.yml logs scheduler
```

### No Products Showing in Dashboard
- **Default (Mock)**: Products are seeded automatically on database init. If you don't see them:
  ```bash
  # Rebuild to trigger database re-initialization
  docker compose -f infra/docker-compose.yml down -v
  docker compose -f infra/docker-compose.yml up --build
  ```
  
- **ScrapingBee**: Check that your API key is correct:
  ```bash
  # Check scheduler logs
  docker compose -f infra/docker-compose.yml logs scheduler | grep -i error
  ```

### Database Connection Errors
```bash
# Ensure PostgreSQL is healthy
docker compose -f infra/docker-compose.yml ps postgres

# Restart database
docker compose -f infra/docker-compose.yml restart postgres
```

### CORS Errors
Verify `CORS_ORIGINS` in `.env` includes `http://localhost:3000`

### Port Already in Use
If ports 3000, 8000, or 8080 are already in use:
```bash
# Stop all containers
docker compose -f infra/docker-compose.yml down

# Or change ports in docker-compose.yml
```

### Reset Everything
```bash
# Stop and remove all containers, volumes, and networks
docker compose -f infra/docker-compose.yml down -v

# Rebuild from scratch
docker compose -f infra/docker-compose.yml up --build
```

## Notes

- All timestamps are in UTC
- The sparkline query fetches the last 30 days of offer history
- Change detection automatically identifies price changes, availability changes, and other modifications
- The ingestor uses upsert logic to avoid duplicates while tracking history

## License

MIT
