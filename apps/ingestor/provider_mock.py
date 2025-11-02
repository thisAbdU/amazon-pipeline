import json
import os
from pathlib import Path
from typing import List, Optional
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


def fetch_products(asins: Optional[List[str]] = None) -> List[ProductIngest]:
    """
    Mock provider that reads products from samples/products.json.
    If asins is provided, filters to only those ASINs.
    """
    samples_dir = Path(__file__).parent / "samples"
    products_file = samples_dir / "products.json"

    if not products_file.exists():
        return []

    with open(products_file, "r") as f:
        all_products = json.load(f)

    products = [ProductIngest(**p) for p in all_products]

    if asins:
        products = [p for p in products if p.asin in asins]

    return products

