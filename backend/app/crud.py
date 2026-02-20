from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from sqlalchemy import func
from .models import Product, Sale, SaleItem, StockMovement, User
from .schemas import ProductCreate, ProductUpdate, SaleCreate
from datetime import datetime, date, time, timedelta
from .auth import hash_password, verify_password

def create_product(db: Session, user_id: int, data: ProductCreate) -> Product:
    # SKU unique por usuario
    if data.sku:
        exists = (
            db.query(Product)
            .filter(Product.owner_id == user_id, Product.sku == data.sku)
            .first()
        )
        if exists:
            raise ValueError("SKU ya existe")

    p = Product(owner_id=user_id, **data.model_dump())
    db.add(p)
    db.commit()
    db.refresh(p)
    return p

def list_products(db: Session, user_id: int, include_inactive: bool = False) -> list[Product]:
    q = db.query(Product).filter(Product.owner_id == user_id)
    if not include_inactive:
        q = q.filter(Product.is_active == True)
    return q.order_by(Product.id.desc()).all()

def get_product(db: Session, user_id: int, product_id: int) -> Product | None:
    return (
        db.query(Product)
        .filter(Product.owner_id == user_id, Product.id == product_id)
        .first()
    )

def update_product(db: Session, user_id: int, product_id: int, data: ProductUpdate) -> Product | None:
    p = get_product(db, user_id, product_id)
    if not p:
        return None

    updates = {k: v for k, v in data.model_dump().items() if v is not None}

    # si cambia sku, validar unique por user
    new_sku = updates.get("sku", None)
    if new_sku:
        exists = (
            db.query(Product)
            .filter(Product.owner_id == user_id, Product.sku == new_sku, Product.id != product_id)
            .first()
        )
        if exists:
            raise ValueError("SKU ya existe")

    for k, v in updates.items():
        setattr(p, k, v)

    db.commit()
    db.refresh(p)
    return p

def delete_product(db: Session, user_id: int, product_id: int) -> bool:
    p = get_product(db, user_id, product_id)
    if not p:
        return False
    p.is_active = False
    db.commit()
    return True

def create_sale(db: Session, user_id: int, data: SaleCreate) -> Sale:
    # 1) Validar productos (del usuario) y stock
    products_map: dict[int, Product] = {}

    for it in data.items:
        p = (
            db.query(Product)
            .filter(
                Product.id == it.product_id,
                Product.owner_id == user_id,
                Product.is_active == True,
            )
            .first()
        )
        if not p:
            raise ValueError(f"Producto {it.product_id} no existe (o no te pertenece / está archivado)")
        if p.stock < it.qty:
            raise ValueError(
                f"Stock insuficiente para '{p.name}'. Disponible: {p.stock}, pedido: {it.qty}"
            )
        products_map[it.product_id] = p

    # 2) Crear venta y items (precio del backend)
    sale = Sale(
        user_id=user_id,
        total=0,
        payment_method=data.payment_method,
    )
    db.add(sale)
    db.flush()  # para tener sale.id

    total = 0.0

    for it in data.items:
        p = products_map[it.product_id]

        unit_price = float(p.price)  # SOURCE OF TRUTH
        line_total = float(it.qty) * unit_price
        total += line_total

        db.add(
            SaleItem(
                sale_id=sale.id,
                product_id=p.id,
                qty=int(it.qty),
                unit_price=unit_price,
            )
        )

        # descontar stock
        p.stock -= int(it.qty)

        # registrar movimiento
        db.add(
            StockMovement(
                user_id=user_id,
                product_id=p.id,
                change=-int(it.qty),
                reason="SALE",
                reference=f"sale:{sale.id}",
                note=None,
            )
        )

    sale.total = total

    db.commit()
    db.refresh(sale)
    return sale

def list_sales(db: Session, user_id: int) -> list[Sale]:
    return (
        db.query(Sale)
        .filter(Sale.user_id == user_id)
        .order_by(Sale.id.desc())
        .all()
    )

def _range_to_datetimes(from_date: date, to_date: date) -> tuple[datetime, datetime]:
    start = datetime.combine(from_date, time.min)
    end = datetime.combine(to_date + timedelta(days=1), time.min)  # exclusivo
    return start, end

def sales_summary(db: Session, user_id: int, from_date: date, to_date: date) -> dict:
    start, end = _range_to_datetimes(from_date, to_date)

    sales = (
        db.query(Sale)
        .filter(
            Sale.user_id == user_id,
            Sale.created_at >= start,
            Sale.created_at < end
        )
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

def sales_rows_for_csv(db: Session, user_id: int, from_date: date, to_date: date) -> list[dict]:
    start, end = _range_to_datetimes(from_date, to_date)

    rows = (
        db.query(Sale, SaleItem, Product)
        .join(SaleItem, SaleItem.sale_id == Sale.id)
        .join(Product, Product.id == SaleItem.product_id)
        .filter(
            Sale.user_id == user_id,
            Sale.created_at >= start,
            Sale.created_at < end)
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

def sales_daily(db: Session, user_id: int, from_date: date, to_date: date) -> list[dict]:
    start, end = _range_to_datetimes(from_date, to_date)

    sales = (
        db.query(Sale)
        .filter(Sale.user_id == user_id, Sale.created_at >= start, Sale.created_at < end)
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

def adjust_stock(db: Session, user_id: int, product_id: int, change: int, reason: str = "ADJUSTMENT", note: str | None = None) -> Product:
    if change == 0:
        raise ValueError("El cambio no puede ser 0")

    p = (
        db.query(Product)
        .filter(Product.owner_id == user_id, Product.id == product_id, Product.is_active == True)
        .first()
    )
    if not p:
        raise ValueError("Producto no existe o está archivado")

    new_stock = int(p.stock) + int(change)
    if new_stock < 0:
        raise ValueError(f"Stock insuficiente. Stock actual: {p.stock}, cambio: {change}")

    p.stock = new_stock
    db.add(StockMovement(
        user_id=user_id,
        product_id=p.id,
        change=int(change),
        reason=reason,
        reference="manual",
        note=note,
    ))
    db.commit()
    db.refresh(p)
    return p


def list_stock_movements(db: Session, user_id: int, product_id: int) -> list[StockMovement]:
    return (
        db.query(StockMovement)
        .filter(StockMovement.user_id == user_id, StockMovement.product_id == product_id)
        .order_by(StockMovement.id.desc())
        .all()
    )

    
def get_user_by_email(db: Session, email: str) -> User | None:
    return db.query(User).filter(User.email == email).first()

def create_user(db: Session, email: str, password: str) -> User:
    print("HASH FN MODULE:", hash_password.__module__)
    print("PASSWORD TYPE:", type(password))
    print("PASSWORD REPR:", repr(password))
    print("PASSWORD BYTES LEN:", len(password.encode("utf-8")))

    email = email.strip().lower()
    if get_user_by_email(db, email):
        raise ValueError("Email ya registrado")

    u = User(email=email, password_hash=hash_password(password))
    db.add(u)
    db.commit()
    db.refresh(u)
    return u

def authenticate_user(db: Session, email: str, password: str) -> User | None:
    u = get_user_by_email(db, email.strip().lower())
    if not u:
        return None
    if not verify_password(password, u.password_hash):
        return None
    if not u.is_active:
        return None
    return u
