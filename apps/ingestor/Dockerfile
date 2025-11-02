FROM python:3.11-slim

WORKDIR /app

# Install system dependencies for Playwright
RUN apt-get update && apt-get install -y \
    wget \
    gnupg \
    && rm -rf /var/lib/apt/lists/*

# Install Python dependencies
RUN pip install --no-cache-dir \
    "pydantic>=2.0.0" \
    "sqlalchemy>=2.0.0" \
    asyncpg>=0.29.0 \
    python-dotenv>=1.0.0 \
    typer>=0.9.0 \
    playwright>=1.40.0 \
    scrapingbee>=1.1.0

# Install Playwright browsers (only if using scraper provider)
# RUN playwright install chromium
# RUN playwright install-deps chromium

# Copy application code
COPY . .

# Default command (can be overridden by docker-compose)
# Run directly since files are copied to /app root
CMD ["python", "run.py", "--once"]

