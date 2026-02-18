from pydantic import BaseModel, Field
from typing import Optional
from datetime import datetime

class ProductCreate(BaseModel):
    name: str = Field(min_length=1, max_length=200)
    sku: Optional[str] = Field(default=None, max_length=64)
    price: float = Field(ge=0, default=0)
    cost: float = Field(ge=0, default=0)
    stock: int = Field(ge=0, default=0)
    stock_min: int = Field(ge=0, default=0)

class ProductUpdate(BaseModel):
    name: Optional[str] = Field(default=None, min_length=1, max_length=200)
    sku: Optional[str] = Field(default=None, max_length=64)
    price: Optional[float] = Field(default=None, ge=0)
    cost: Optional[float] = Field(default=None, ge=0)
    stock: Optional[int] = Field(default=None, ge=0)
    stock_min: Optional[int] = Field(default=None, ge=0)
    is_active: Optional[bool] = None

class ProductOut(BaseModel):
    id: int
    name: str
    sku: Optional[str]
    price: float
    cost: float
    stock: int
    stock_min: int
    is_active: bool
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class SaleItemCreate(BaseModel):
    product_id: int
    qty: int = Field(gt=0)

class SaleCreate(BaseModel):
    payment_method: str = Field(default="UNSPECIFIED", max_length=32)
    items: list[SaleItemCreate]

class SaleItemOut(BaseModel):
    product_id: int
    qty: int
    unit_price: float

    class Config:
        from_attributes = True

class SaleOut(BaseModel):
    id: int
    total: float
    payment_method: str
    items: list[SaleItemOut]

    class Config:
        from_attributes = True
