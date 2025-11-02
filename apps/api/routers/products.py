from fastapi import APIRouter, Depends, Query
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text
from typing import Optional
from db import get_session

router = APIRouter()


@router.get("/products")
async def get_products(
    q: Optional[str] = Query(None, description="Search query"),
    brand: Optional[str] = Query(None),
    category: Optional[str] = Query(None),
    min_price: Optional[float] = Query(None),
    max_price: Optional[float] = Query(None),
    in_stock: Optional[bool] = Query(None),
    limit: int = Query(50, ge=1, le=100),
    offset: int = Query(0, ge=0),
    session: AsyncSession = Depends(get_session),
):
    conditions = []
    params = {}

    if q:
        conditions.append("p.title ILIKE :q")
        params["q"] = f"%{q}%"

    if brand:
        conditions.append("p.brand = :brand")
        params["brand"] = brand

    if category:
        conditions.append("p.category = :category")
        params["category"] = category

    if min_price is not None:
        conditions.append("lo.price >= :min_price")
        params["min_price"] = min_price

    if max_price is not None:
        conditions.append("lo.price <= :max_price")
        params["max_price"] = max_price

    if in_stock is not None:
        if in_stock:
            conditions.append("lo.availability ILIKE :in_stock_pattern")
            params["in_stock_pattern"] = "%in stock%"
        else:
            conditions.append("(lo.availability IS NULL OR lo.availability NOT ILIKE :in_stock_pattern)")
            params["in_stock_pattern"] = "%in stock%"

    where_clause = " AND " + " AND ".join(conditions) if conditions else ""

    query = text(f"""
        WITH latest_offers AS (
            SELECT DISTINCT ON (product_id)
                id, product_id, price, currency, availability, seller, fetched_at
            FROM offers
            ORDER BY product_id, fetched_at DESC
        )
        SELECT 
            p.asin,
            p.title,
            p.brand,
            p.category,
            p.image_url,
            lo.price,
            lo.currency,
            lo.availability,
            lo.seller,
            lo.fetched_at as offer_fetched_at
        FROM products p
        LEFT JOIN latest_offers lo ON p.asin = lo.product_id
        WHERE 1=1 {where_clause}
        ORDER BY p.updated_at DESC
        LIMIT :limit OFFSET :offset
    """)

    params["limit"] = limit
    params["offset"] = offset

    result = await session.execute(query, params)
    rows = result.fetchall()

    products = []
    for row in rows:
        products.append({
            "asin": row.asin,
            "title": row.title,
            "brand": row.brand,
            "category": row.category,
            "image_url": row.image_url,
            "latest_offer": {
                "price": float(row.price) if row.price else None,
                "currency": row.currency,
                "availability": row.availability,
                "seller": row.seller,
                "fetched_at": row.offer_fetched_at.isoformat() if row.offer_fetched_at else None,
            } if row.price else None,
        })

    return {"products": products, "limit": limit, "offset": offset}


@router.get("/products/{asin}")
async def get_product_detail(
    asin: str,
    session: AsyncSession = Depends(get_session),
):
    # Get product with latest offer
    query = text("""
        WITH latest_offer AS (
            SELECT DISTINCT ON (product_id)
                id, product_id, price, currency, availability, seller, fetched_at
            FROM offers
            WHERE product_id = :asin
            ORDER BY product_id, fetched_at DESC
        )
        SELECT 
            p.asin,
            p.title,
            p.brand,
            p.category,
            p.image_url,
            p.created_at,
            p.updated_at,
            lo.price,
            lo.currency,
            lo.availability,
            lo.seller,
            lo.fetched_at as offer_fetched_at
        FROM products p
        LEFT JOIN latest_offer lo ON p.asin = lo.product_id
        WHERE p.asin = :asin
    """)

    result = await session.execute(query, {"asin": asin})
    row = result.fetchone()

    if not row:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Product not found")

    # Get sparkline data (last 30 days)
    sparkline_query = text("""
        SELECT 
            price,
            currency,
            availability,
            change_type,
            fetched_at
        FROM offer_history
        WHERE product_id = :asin
          AND fetched_at >= NOW() - INTERVAL '30 days'
        ORDER BY fetched_at ASC
    """)

    sparkline_result = await session.execute(sparkline_query, {"asin": asin})
    sparkline_rows = sparkline_result.fetchall()

    sparkline = [
        {
            "price": float(row.price) if row.price else None,
            "currency": row.currency,
            "availability": row.availability,
            "change_type": row.change_type,
            "fetched_at": row.fetched_at.isoformat() if row.fetched_at else None,
        }
        for row in sparkline_rows
    ]

    return {
        "asin": row.asin,
        "title": row.title,
        "brand": row.brand,
        "category": row.category,
        "image_url": row.image_url,
        "created_at": row.created_at.isoformat() if row.created_at else None,
        "updated_at": row.updated_at.isoformat() if row.updated_at else None,
        "latest_offer": {
            "price": float(row.price) if row.price else None,
            "currency": row.currency,
            "availability": row.availability,
            "seller": row.seller,
            "fetched_at": row.offer_fetched_at.isoformat() if row.offer_fetched_at else None,
        } if row.price else None,
        "sparkline": sparkline,
    }

