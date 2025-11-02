from sqlalchemy import Column, String, Text, DECIMAL, Integer, TIMESTAMP, ForeignKey
from sqlalchemy.sql import func
from sqlalchemy.orm import DeclarativeBase, relationship


class Base(DeclarativeBase):
    pass


class Product(Base):
    __tablename__ = "products"

    asin = Column(String(10), primary_key=True)
    title = Column(Text, nullable=False)
    brand = Column(String(255))
    category = Column(String(255))
    image_url = Column(Text)
    created_at = Column(TIMESTAMP(timezone=True), server_default=func.now())
    updated_at = Column(TIMESTAMP(timezone=True), server_default=func.now(), onupdate=func.now())


class Offer(Base):
    __tablename__ = "offers"

    id = Column(Integer, primary_key=True)
    product_id = Column(String(10), ForeignKey("products.asin", ondelete="CASCADE"), nullable=False)
    price = Column(DECIMAL(10, 2))
    currency = Column(String(3), default="USD")
    availability = Column(String(50))
    seller = Column(String(255))
    fetched_at = Column(TIMESTAMP(timezone=True), server_default=func.now())

