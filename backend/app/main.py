from fastapi import FastAPI, Depends, HTTPException
from sqlalchemy.orm import Session
from fastapi.middleware.cors import CORSMiddleware
from .db import Base, engine, get_db
from . import crud, schemas, models
from datetime import date
from fastapi import Query
from fastapi.responses import StreamingResponse
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from .auth import create_access_token, decode_token
import csv
import io

app = FastAPI(title="Stock App API")

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/auth/login")

def get_current_user(db: Session = Depends(get_db), token: str = Depends(oauth2_scheme)) -> models.User:
    try:
        email = decode_token(token)
    except Exception:
        raise HTTPException(status_code=401, detail="Token inválido")

    u = crud.get_user_by_email(db, email)
    if not u:
        raise HTTPException(status_code=401, detail="Usuario no encontrado")
    if not u.is_active:
        raise HTTPException(status_code=403, detail="Usuario inactivo")
    return u


app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/health")
def health():
    return {"ok": True}

@app.post("/products", response_model=schemas.ProductOut)
def create_product(
    payload: schemas.ProductCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    try:
        return crud.create_product(db, current_user.id, payload)
    except ValueError as e:
        msg = str(e)
        if "SKU ya existe" in msg:
            raise HTTPException(status_code=409, detail=msg)
        raise HTTPException(status_code=400, detail=msg)

@app.get("/products", response_model=list[schemas.ProductOut])
def list_products(
    include_inactive: bool = False,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    return crud.list_products(db, current_user.id, include_inactive=include_inactive)

@app.get("/products/{product_id}", response_model=schemas.ProductOut)
def get_product(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    p = crud.get_product(db, current_user.id, product_id)
    if not p:
        raise HTTPException(status_code=404, detail="Product not found")
    return p

@app.patch("/products/{product_id}", response_model=schemas.ProductOut)
def update_product(
    product_id: int,
    payload: schemas.ProductUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    try:
        p = crud.update_product(db, current_user.id, product_id, payload)
    except ValueError as e:
        msg = str(e)
        if "SKU ya existe" in msg:
            raise HTTPException(status_code=409, detail=msg)
        raise HTTPException(status_code=400, detail=msg)

    if not p:
        raise HTTPException(status_code=404, detail="Product not found")
    return p


@app.delete("/products/{product_id}")
def delete_product(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    ok = crud.delete_product(db, current_user.id, product_id)
    if not ok:
        raise HTTPException(status_code=404, detail="Product not found")
    return {"deleted": True}


@app.post("/sales", response_model=schemas.SaleOut)
def create_sale(
    payload: schemas.SaleCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    try:
        return crud.create_sale(db, current_user.id, payload)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/sales", response_model=list[schemas.SaleOut])
def list_sales(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    return crud.list_sales(db, current_user.id)


@app.get("/reports/sales/summary")
def report_sales_summary(
    from_date: date = Query(..., alias="from"),
    to_date: date = Query(..., alias="to"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    return crud.sales_summary(db, current_user.id, from_date, to_date)


@app.get("/reports/sales/export.csv")
def report_sales_export_csv(
    from_date: date = Query(..., alias="from"),
    to_date: date = Query(..., alias="to"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    rows = crud.sales_rows_for_csv(db, current_user.id, from_date, to_date)

    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=[
        "sale_id",
        "sale_datetime",
        "payment_method",
        "product_id",
        "product_name",
        "qty",
        "unit_price",
        "line_total",
        "sale_total",
    ])
    writer.writeheader()
    writer.writerows(rows)

    output.seek(0)

    filename = f"ventas_{from_date}_a_{to_date}.csv"
    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
    
@app.get("/reports/sales/daily")
def report_sales_daily(
    from_date: date = Query(..., alias="from"),
    to_date: date = Query(..., alias="to"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    return {
        "from": str(from_date),
        "to": str(to_date),
        "days": crud.sales_daily(db, current_user.id, from_date, to_date),
    }


@app.get("/reports/sales/daily/export.csv")
def report_sales_daily_export_csv(
    from_date: date = Query(..., alias="from"),
    to_date: date = Query(..., alias="to"),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    data = crud.sales_daily(db, current_user.id, from_date, to_date)

    # Armamos CSV con columnas: date, count_sales, total + cada payment_method
    all_methods = sorted({m for d in data for m in d["by_payment_method"].keys()})

    output = io.StringIO()
    fieldnames = ["date", "count_sales", "total"] + [f"pm_{m}" for m in all_methods]
    writer = csv.DictWriter(output, fieldnames=fieldnames)
    writer.writeheader()

    for d in data:
        row = {
            "date": d["date"],
            "count_sales": d["count_sales"],
            "total": d["total"],
        }
        for m in all_methods:
            row[f"pm_{m}"] = d["by_payment_method"].get(m, 0.0)
        writer.writerow(row)

    output.seek(0)
    filename = f"ventas_diarias_{from_date}_a_{to_date}.csv"

    return StreamingResponse(
        iter([output.getvalue()]),
        media_type="text/csv; charset=utf-8",
        headers={"Content-Disposition": f'attachment; filename="{filename}"'},
    )
    
@app.post("/products/{product_id}/stock", response_model=schemas.ProductOut)
def adjust_product_stock(
    product_id: int,
    payload: schemas.StockAdjust,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    try:
        return crud.adjust_stock(
            db,
            user_id=current_user.id,
            product_id=product_id,
            change=payload.change,
            reason=payload.reason,
            note=payload.note,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@app.get("/products/{product_id}/stock-movements", response_model=list[schemas.StockMovementOut])
def get_product_stock_movements(
    product_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    return crud.list_stock_movements(db, current_user.id, product_id)


@app.post("/auth/register", response_model=schemas.UserOut)
def register(payload: schemas.UserRegister, db: Session = Depends(get_db)):
    try:
        return crud.create_user(db, payload.email, payload.password)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))

@app.post("/auth/login", response_model=schemas.TokenOut)
def login(form: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)):
    u = crud.authenticate_user(db, form.username, form.password)  # username = email
    if not u:
        raise HTTPException(status_code=401, detail="Credenciales inválidas")

    token = create_access_token(subject=u.email)
    return {"access_token": token, "token_type": "bearer"}

@app.get("/auth/me", response_model=schemas.UserOut)
def me(current_user: models.User = Depends(get_current_user)):
    return current_user
