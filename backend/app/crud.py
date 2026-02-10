from sqlalchemy.orm import Session
from .models import Product, Sale, SaleItem
from .schemas import ProductCreate, ProductUpdate, SaleCreate
from datetime import datetime, date, time, timedelta
from sqlalchemy import select

def create_product(db: Session, data: ProductCreate) -> Product:
    p = Product(**data.model_dump())
    db.add(p)
    db.commit()
    db.refresh(p)
    return p

def list_products(db: Session) -> list[Product]:
    return db.query(Product).order_by(Product.id.desc()).all()

def get_product(db: Session, product_id: int) -> Product | None:
    return db.query(Product).filter(Product.id == product_id).first()

def update_product(db: Session, product_id: int, data: ProductUpdate) -> Product | None:
    p = get_product(db, product_id)
    if not p:
        return None
    updates = {k: v for k, v in data.model_dump().items() if v is not None}
    for k, v in updates.items():
        setattr(p, k, v)
    db.commit()
    db.refresh(p)
    return p

def delete_product(db: Session, product_id: int) -> bool:
    p = get_product(db, product_id)
    if not p:
        return False
    db.delete(p)
    db.commit()
    return True

def create_sale(db: Session, data: SaleCreate) -> Sale:
    # Validar productos y stock
    products_map: dict[int, Product] = {}
    for it in data.items:
        p = db.query(Product).filter(Product.id == it.product_id).first()
        if not p:
            raise ValueError(f"Producto {it.product_id} no existe")
        if p.stock < it.qty:
            raise ValueError(f"Stock insuficiente para '{p.name}'. Disponible: {p.stock}, pedido: {it.qty}")
        products_map[it.product_id] = p

    # Calcular total
    total = sum((it.qty * it.unit_price) for it in data.items)

    sale = Sale(total=total, payment_method=data.payment_method)
    db.add(sale)
    db.flush()  # para tener sale.id

    # Crear items y descontar stock
    for it in data.items:
        db.add(SaleItem(
            sale_id=sale.id,
            product_id=it.product_id,
            qty=it.qty,
            unit_price=it.unit_price,
        ))
        products_map[it.product_id].stock -= it.qty

    db.commit()
    db.refresh(sale)
    return sale

def list_sales(db: Session) -> list[Sale]:
    return db.query(Sale).order_by(Sale.id.desc()).all()

def _range_to_datetimes(from_date: date, to_date: date) -> tuple[datetime, datetime]:
    start = datetime.combine(from_date, time.min)
    end = datetime.combine(to_date + timedelta(days=1), time.min)  # exclusivo
    return start, end

def sales_summary(db: Session, from_date: date, to_date: date) -> dict:
    start, end = _range_to_datetimes(from_date, to_date)

    sales = (
        db.query(Sale)
        .filter(Sale.created_at >= start, Sale.created_at < end)
        .all()
    )

    total = float(sum([float(s.total) for s in sales]))
    by_payment: dict[str, float] = {}
    count = len(sales)

    for s in sales:
        pm = s.payment_method or "UNSPECIFIED"
        by_payment[pm] = by_payment.get(pm, 0.0) + float(s.total)

    # redondeo a 2 decimales
    by_payment = {k: round(v, 2) for k, v in by_payment.items()}

    return {
        "from": str(from_date),
        "to": str(to_date),
        "count_sales": count,
        "total": round(total, 2),
        "by_payment_method": by_payment,
    }

def sales_rows_for_csv(db: Session, from_date: date, to_date: date) -> list[dict]:
    start, end = _range_to_datetimes(from_date, to_date)

    rows = (
        db.query(Sale, SaleItem, Product)
        .join(SaleItem, SaleItem.sale_id == Sale.id)
        .join(Product, Product.id == SaleItem.product_id)
        .filter(Sale.created_at >= start, Sale.created_at < end)
        .order_by(Sale.id.asc(), SaleItem.id.asc())
        .all()
    )

    out = []
    for sale, item, product in rows:
        line_total = float(item.qty) * float(item.unit_price)
        out.append({
            "sale_id": sale.id,
            "sale_datetime": str(sale.created_at),
            "payment_method": sale.payment_method,
            "product_id": product.id,
            "product_name": product.name,
            "qty": int(item.qty),
            "unit_price": float(item.unit_price),
            "line_total": round(line_total, 2),
            "sale_total": float(sale.total),
        })
    return out

def sales_daily(db, from_date: date, to_date: date) -> list[dict]:
    start, end = _range_to_datetimes(from_date, to_date)

    sales = (
        db.query(Sale)
        .filter(Sale.created_at >= start, Sale.created_at < end)
        .all()
    )

    # Agrupar en Python por (YYYY-MM-DD)
    by_day: dict[str, dict] = {}
    for s in sales:
        day = s.created_at.date().isoformat()
        pm = (s.payment_method or "UNSPECIFIED").upper()
        amount = float(s.total)

        if day not in by_day:
            by_day[day] = {
                "date": day,
                "count_sales": 0,
                "total": 0.0,
                "by_payment_method": {},
            }

        by_day[day]["count_sales"] += 1
        by_day[day]["total"] += amount
        by_day[day]["by_payment_method"][pm] = by_day[day]["by_payment_method"].get(pm, 0.0) + amount

    # Normalizar y ordenar
    out = []
    for day in sorted(by_day.keys()):
        row = by_day[day]
        row["total"] = round(row["total"], 2)
        row["by_payment_method"] = {k: round(v, 2) for k, v in row["by_payment_method"].items()}
        out.append(row)

    return out